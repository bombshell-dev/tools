import { fileURLToPath } from "node:url";
import { parse } from "@bomb.sh/args";
import { publint } from "publint";
import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";
import { local } from "../utils.ts";

const oxlintConfig = fileURLToPath(new URL("../../oxlintrc.json", import.meta.url));

// -- Types --

interface Violation {
  tool: "oxlint" | "publint" | "knip" | "tsc";
  level: "error" | "warning" | "suggestion";
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

// -- Tool Runners --

async function runOxlint(targets: string[], fix?: boolean): Promise<Violation[]> {
  const args = ["-c", oxlintConfig, "--format=json", ...targets];
  if (fix) args.push("--fix");
  const result = await x(local("oxlint"), args, { throwOnError: false });
  const json = JSON.parse(result.stdout);
  return (json.diagnostics ?? []).map(
    (d: {
      message: string;
      code: string;
      severity: string;
      filename?: string;
      labels?: Array<{ span?: { line?: number; column?: number } }>;
    }) => ({
      tool: "oxlint" as const,
      level: d.severity === "error" ? "error" : "warning",
      code: d.code ?? "unknown",
      message: d.message,
      file: d.filename,
      line: d.labels?.[0]?.span?.line,
      column: d.labels?.[0]?.span?.column,
    }),
  );
}

async function runPublint(): Promise<Violation[]> {
  const result = await publint({ strict: true });
  return result.messages.map((m) => ({
    tool: "publint" as const,
    level: m.type === "error" ? "error" : m.type === "warning" ? "warning" : "suggestion",
    code: m.code,
    message: m.code,
    file: "package.json",
    line: undefined,
    column: undefined,
  }));
}

interface KnipIssue {
  file: string;
  dependencies: Array<{ name: string; line: number; col: number }>;
  devDependencies: Array<{ name: string; line: number; col: number }>;
  exports: Array<{ name: string; line: number; col: number }>;
  types: Array<{ name: string; line: number; col: number }>;
}

async function runKnip(): Promise<Violation[]> {
  const args = ["--no-progress", "--reporter", "json"];
  const result = await x(local("knip"), args, { throwOnError: false });
  if (!result.stdout.trim()) return [];
  const json = JSON.parse(result.stdout);
  const violations: Violation[] = [];

  for (const issue of json.issues as KnipIssue[]) {
    for (const dep of issue.dependencies) {
      violations.push({
        tool: "knip",
        level: "warning",
        code: "unused-dependency",
        message: `Unused dependency '${dep.name}'`,
        file: issue.file,
        line: dep.line,
        column: dep.col,
      });
    }
    for (const dep of issue.devDependencies) {
      violations.push({
        tool: "knip",
        level: "warning",
        code: "unused-devDependency",
        message: `Unused devDependency '${dep.name}'`,
        file: issue.file,
        line: dep.line,
        column: dep.col,
      });
    }
    for (const exp of issue.exports) {
      violations.push({
        tool: "knip",
        level: "warning",
        code: "unused-export",
        message: `Unused export '${exp.name}'`,
        file: issue.file,
        line: exp.line,
        column: exp.col,
      });
    }
    for (const t of issue.types) {
      violations.push({
        tool: "knip",
        level: "warning",
        code: "unused-type",
        message: `Unused type '${t.name}'`,
        file: issue.file,
        line: t.line,
        column: t.col,
      });
    }
  }

  for (const file of json.files as string[]) {
    violations.push({
      tool: "knip",
      level: "warning",
      code: "unused-file",
      message: `Unused file`,
      file,
    });
  }

  return violations;
}

async function runTypeScript(targets: string[]): Promise<Violation[]> {
  const args =
    targets.length > 0
      ? ["--noEmit", "--pretty", "false", ...targets]
      : ["--noEmit", "--pretty", "false"];
  const result = await x(local("tsgo"), args, { throwOnError: false });
  const output = result.stdout + result.stderr;
  if (!output.trim()) return [];

  const violations: Violation[] = [];
  const re = /^(.+)\((\d+),(\d+)\): (error|warning) (TS\d+): (.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(output)) !== null) {
    violations.push({
      tool: "tsc",
      level: match[4] === "error" ? "error" : "warning",
      code: match[5]!,
      message: match[6]!,
      file: match[1]!,
      line: Number(match[2]),
      column: Number(match[3]),
    });
  }
  return violations;
}

// -- Output --

function printViolations(violations: Violation[]) {
  const grouped = new Map<string, Violation[]>();
  for (const v of violations) {
    const key = v.file ?? "(project)";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(v);
  }

  const colors = {
    error: "\x1b[31m",
    warning: "\x1b[33m",
    suggestion: "\x1b[34m",
    dim: "\x1b[2m",
    reset: "\x1b[0m",
  };

  for (const [file, items] of grouped) {
    console.log(`\n${file}`);
    for (const v of items) {
      const loc = v.line != null ? `  ${v.line}:${v.column ?? 0}` : "  -";
      const color = colors[v.level];
      const tag = `${v.tool}/${v.code}`;
      console.log(
        `${colors.dim}${loc.padEnd(10)}${colors.reset}${color}${v.level.padEnd(12)}${colors.reset}${v.message}  ${colors.dim}${tag}${colors.reset}`,
      );
    }
  }

  const counts = { error: 0, warning: 0, suggestion: 0 };
  for (const v of violations) counts[v.level]++;
  const parts = [];
  if (counts.error)
    parts.push(`${colors.error}${counts.error} error${counts.error > 1 ? "s" : ""}${colors.reset}`);
  if (counts.warning)
    parts.push(
      `${colors.warning}${counts.warning} warning${counts.warning > 1 ? "s" : ""}${colors.reset}`,
    );
  if (counts.suggestion)
    parts.push(
      `${colors.suggestion}${counts.suggestion} suggestion${counts.suggestion > 1 ? "s" : ""}${colors.reset}`,
    );
  if (parts.length > 0) {
    console.log(`\n${parts.join(", ")}`);
  } else {
    console.log("\nNo issues found.");
  }
}

// -- Main --

async function collectViolations(targets: string[]): Promise<Violation[]> {
  const results = await Promise.allSettled([
    runOxlint(targets),
    runPublint(),
    runKnip(),
    runTypeScript(targets),
  ]);

  const violations: Violation[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      violations.push(...result.value);
    } else {
      console.error(result.reason);
    }
  }
  return violations;
}

export async function lint(ctx: CommandContext) {
  const args = parse(ctx.args, {
    boolean: ["fix"],
  });
  const targets = args._.length > 0 ? args._.map(String) : ["./src"];

  if (args.fix) {
    await runOxlint(targets, true);

    // Report remaining
    const remaining = await collectViolations(targets);
    if (remaining.length > 0) {
      printViolations(remaining);
      process.exit(1);
    }
    console.log("No issues found.");
    return;
  }

  // Default: report only
  const violations = await collectViolations(targets);
  printViolations(violations);
  if (violations.some((v) => v.level === "error")) {
    process.exit(1);
  }
}
