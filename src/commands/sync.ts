import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { cwd, platform } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "ultramatter";
import type { CommandContext } from "../context.ts";

const SENTINEL_START = "<!-- bsh:skills -->";
const SENTINEL_END = "<!-- /bsh:skills -->";
const GITIGNORE_START = "# bsh:skills";
const GITIGNORE_END = "# /bsh:skills";

export async function sync(_ctx: CommandContext): Promise<void> {
  const root = pathToFileURL(`${cwd()}/`);

  if (await isSelf(root)) {
    console.info("Skipping sync — running inside @bomb.sh/tools");
    return;
  }

  const source = new URL("node_modules/@bomb.sh/tools/skills/", root);
  if (!(await exists(source))) {
    console.error("@bomb.sh/tools is not installed. Run `pnpm add -D @bomb.sh/tools` first.");
    return;
  }

  const skills = await copySkills({ source, dest: new URL("skills/", root) });
  await updateGitignore({ root, skills });
  await updateAgentsMd({ root, skills });

  console.info(`Synced ${skills.length} skills to skills/`);
}

interface SkillInfo {
  name: string;
  description: string;
}

async function copySkills(options: { source: URL; dest: URL }): Promise<SkillInfo[]> {
  const { source, dest } = options;
  const skills: SkillInfo[] = [];
  const entries = await readdir(source, { withFileTypes: true });
  const keep = new Set<string>(
    entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name),
  );

  await mkdir(dest, { recursive: true });
  await pruneStaleLinks({ dest, source, keep });

  const destDirPath = fileURLToPath(dest);
  const linkType = platform === "win32" ? "junction" : "dir";

  for (const name of keep) {
    const srcDir = new URL(`${name}/`, source);
    const destDir = new URL(`${name}/`, dest);

    await rm(destDir, { recursive: true, force: true });

    const target = relative(destDirPath, fileURLToPath(srcDir));
    await symlink(target, fileURLToPath(destDir), linkType);

    const skillMd = new URL("SKILL.md", srcDir);
    if (await exists(skillMd)) {
      const content = await readFile(skillMd, "utf8");
      const frontmatter = parseFrontmatter(content);
      if (frontmatter) {
        skills.push(frontmatter);
      }
    }
  }

  return skills;
}

async function pruneStaleLinks(options: {
  dest: URL;
  source: URL;
  keep: Set<string>;
}): Promise<void> {
  const { dest, source, keep } = options;
  const destPath = fileURLToPath(dest);
  const sourcePath = fileURLToPath(source);

  let entries: Dirent[];
  try {
    entries = await readdir(dest, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;
    if (keep.has(entry.name)) continue;

    const linkPath = fileURLToPath(new URL(entry.name, dest));
    try {
      const target = await readlink(linkPath);
      const absTarget = isAbsolute(target) ? target : resolve(destPath, target);
      if (absTarget.startsWith(sourcePath)) {
        await rm(linkPath, { recursive: true, force: true });
      }
    } catch {
      // ignore unreadable links
    }
  }
}

async function updateGitignore(options: { root: URL; skills: SkillInfo[] }): Promise<void> {
  const { root, skills } = options;
  const gitignorePath = new URL(".gitignore", root);
  let content = "";
  if (await exists(gitignorePath)) {
    content = await readFile(gitignorePath, "utf8");
  }

  const lines = skills.map((s) => `skills/${s.name}/`);
  const section = [GITIGNORE_START, ...lines, GITIGNORE_END].join("\n");

  const startIdx = content.indexOf(GITIGNORE_START);
  const endIdx = content.indexOf(GITIGNORE_END);

  if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + section + content.slice(endIdx + GITIGNORE_END.length);
  } else if (skills.length > 0) {
    const suffix = content.endsWith("\n") || content === "" ? "" : "\n";
    content = content + suffix + "\n" + section + "\n";
  }

  await writeFile(gitignorePath, content, "utf8");
}

async function updateAgentsMd(options: { root: URL; skills: SkillInfo[] }): Promise<void> {
  const { root, skills } = options;
  const agentsPath = new URL("AGENTS.md", root);
  let content = "";
  if (await exists(agentsPath)) {
    content = await readFile(agentsPath, "utf8");
  }

  const lines = skills.map((s) => {
    const desc = s.description.split(".")[0].trim();
    return `- **${s.name}** — [skills/${s.name}/SKILL.md](skills/${s.name}/SKILL.md) — ${desc}`;
  });

  const section = [
    SENTINEL_START,
    "## @bomb.sh/tools Skills",
    "",
    "When working on these tasks, read the linked skill file for guidance:",
    "",
    ...lines,
    SENTINEL_END,
  ].join("\n");

  const startIdx = content.indexOf(SENTINEL_START);
  const endIdx = content.indexOf(SENTINEL_END);

  if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + section + content.slice(endIdx + SENTINEL_END.length);
  } else {
    const suffix = content.endsWith("\n") || content === "" ? "" : "\n";
    content = content + suffix + "\n" + section + "\n";
  }

  await writeFile(agentsPath, content, "utf8");
}

function parseFrontmatter(content: string): SkillInfo | undefined {
  const { frontmatter } = parse(content);
  if (!frontmatter) return undefined;
  const name = frontmatter.name as string | undefined;
  const description =
    (frontmatter.description as string | undefined)?.trim().replaceAll(/\s+/g, " ") ?? "";
  if (!name) return undefined;
  return { name, description };
}

async function isSelf(root: URL): Promise<boolean> {
  const content = await safeRead(new URL("package.json", root));
  if (!content) return false;
  const pkg = JSON.parse(content) as { name?: string };
  return pkg.name === "@bomb.sh/tools";
}

async function safeRead(url: URL): Promise<string | null> {
  try {
    return await readFile(url, "utf8");
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return null;
    throw err;
  }
}
