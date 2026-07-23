import { fileURLToPath } from 'node:url';
import { parse } from '@bomb.sh/args';
import { x } from 'tinyexec';
import type { JSONReport as KnipJSONReport } from 'knip';
import type { CommandContext } from '../context.ts';
import { local } from '../utils.ts';

const oxlintConfig = fileURLToPath(new URL('../../oxlintrc.json', import.meta.url));

// -- Types --

interface Violation {
	tool: 'oxlint' | 'publint' | 'knip' | 'tsc';
	level: 'error' | 'warning' | 'suggestion';
	code: string;
	message: string;
	file?: string;
	line?: number;
	column?: number;
}

// -- Tool Runners --

export async function runOxlint(targets: string[], fix?: boolean): Promise<Violation[]> {
	const args = ['-c', oxlintConfig, '--format=json', ...targets];
	if (fix) args.push('--fix');
	const result = await x(local('oxlint'), args, { throwOnError: false });
	try {
		const json = JSON.parse(result.stdout);
		return (json.diagnostics ?? []).map(
			(d: {
				message: string;
				code: string;
				severity: string;
				filename?: string;
				labels?: Array<{ span?: { line?: number; column?: number } }>;
			}) => ({
				tool: 'oxlint' as const,
				level: d.severity === 'error' ? 'error' : 'warning',
				code: d.code ?? 'unknown',
				message: d.message,
				file: d.filename,
				line: d.labels?.[0]?.span?.line,
				column: d.labels?.[0]?.span?.column,
			}),
		);
	} catch {
		// in some cases, failures or no-ops do not produce valid JSON
		// fallback to raw output rather than throwing an error
		console.log(result.stdout);
		return [];
	}
}

/**
 * Knip dead-code issue kinds (unused exports/types/files) fire constantly
 * mid-implementation — an export is "unused" until its consumer exists.
 * They only carry signal as a commit-time gate, so they require `--strict`.
 * Dependency hygiene issues are stable and always reported.
 */
export async function runKnip(options?: { strict?: boolean }): Promise<Violation[]> {
	const args = ['--no-progress', '--reporter', 'json'];
	const result = await x(local('knip'), args, { throwOnError: false });
	if (!result.stdout.trim()) return [];

	const json: KnipJSONReport = JSON.parse(result.stdout);
	const violations: Violation[] = [];

	for (const issue of json.issues) {
		for (const dep of issue.dependencies ?? []) {
			violations.push({
				tool: 'knip',
				level: 'warning',
				code: 'unused-dependency',
				message: `Unused dependency '${dep.name}'`,
				file: issue.file,
				line: dep.line,
				column: dep.col,
			});
		}
		for (const dep of issue.devDependencies ?? []) {
			violations.push({
				tool: 'knip',
				level: 'warning',
				code: 'unused-devDependency',
				message: `Unused devDependency '${dep.name}'`,
				file: issue.file,
				line: dep.line,
				column: dep.col,
			});
		}
		if (!options?.strict) continue;
		for (const exp of issue.exports ?? []) {
			violations.push({
				tool: 'knip',
				level: 'warning',
				code: 'unused-export',
				message: `Unused export '${exp.name}'`,
				file: issue.file,
				line: exp.line,
				column: exp.col,
			});
		}
		for (const t of issue.types ?? []) {
			violations.push({
				tool: 'knip',
				level: 'warning',
				code: 'unused-type',
				message: `Unused type '${t.name}'`,
				file: issue.file,
				line: t.line,
				column: t.col,
			});
		}
		for (const file of issue.files ?? []) {
			violations.push({
				tool: 'knip',
				level: 'warning',
				code: 'unused-file',
				message: `Unused file`,
				file: issue.file,
				line: file.line,
				column: file.col,
			});
		}
	}

	return violations;
}

async function runTypeScript(targets: string[]): Promise<Violation[]> {
	// Always run in project mode: passing files on the command line makes
	// tsgo skip the tsconfig (TS5112). Explicit targets filter the report
	// after the fact instead.
	const result = await x(local('tsgo'), ['--noEmit', '--pretty', 'false'], {
		throwOnError: false,
	});
	const output = result.stdout + result.stderr;
	if (!output.trim()) return [];

	const violations: Violation[] = [];
	const re = /^(.+)\((\d+),(\d+)\): (error|warning) (TS\d+): (.+)$/gm;
	let match: RegExpExecArray | null;
	while ((match = re.exec(output)) !== null) {
		violations.push({
			tool: 'tsc',
			level: match[4] === 'error' ? 'error' : 'warning',
			code: match[5]!,
			message: match[6]!,
			file: match[1]!,
			line: Number(match[2]),
			column: Number(match[3]),
		});
	}
	if (targets.length === 0) return violations;
	const prefixes = targets.map((t) => t.replace(/^\.\//, ''));
	return violations.filter((v) => v.file && prefixes.some((p) => v.file!.startsWith(p)));
}

// -- Output --

const colors = {
	error: '\x1b[31m',
	warning: '\x1b[33m',
	suggestion: '\x1b[34m',
	dim: '\x1b[2m',
	reset: '\x1b[0m',
};

function printViolation(v: Violation) {
	const loc = v.line != null ? `  ${v.line}:${v.column ?? 0}` : '  -';
	const color = colors[v.level];
	const tag = `${v.tool}/${v.code}`;
	console.log(
		`${colors.dim}${loc.padEnd(10)}${colors.reset}${color}${v.level.padEnd(12)}${colors.reset}${v.message}  ${colors.dim}${tag}${colors.reset}`,
	);
}

function countByLevel(violations: Violation[]) {
	const counts = { error: 0, warning: 0, suggestion: 0 };
	for (const v of violations) counts[v.level]++;
	return counts;
}

function printSummary(violations: Violation[]) {
	const counts = countByLevel(violations);
	const parts = [];
	if (counts.error)
		parts.push(`${colors.error}${counts.error} error${counts.error > 1 ? 's' : ''}${colors.reset}`);
	if (counts.warning)
		parts.push(
			`${colors.warning}${counts.warning} warning${counts.warning > 1 ? 's' : ''}${colors.reset}`,
		);
	if (counts.suggestion)
		parts.push(
			`${colors.suggestion}${counts.suggestion} suggestion${counts.suggestion > 1 ? 's' : ''}${colors.reset}`,
		);
	console.log(parts.length > 0 ? `\n${parts.join(', ')}` : '\nNo issues found.');
}

/**
 * Print violations grouped by file. Errors are always shown in full.
 * Warnings collapse to a per-rule count unless `warnings` is set — they
 * don't affect the exit code, so a wall of them buries actual failures.
 */
export function printViolations(violations: Violation[], options?: { warnings?: boolean }) {
	const showWarnings = options?.warnings ?? false;
	const visible = showWarnings ? violations : violations.filter((v) => v.level === 'error');

	const grouped = new Map<string, Violation[]>();
	for (const v of visible) {
		const key = v.file ?? '(project)';
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(v);
	}

	for (const [file, items] of grouped) {
		console.log(`\n${file}`);
		for (const v of items) printViolation(v);
	}

	if (!showWarnings) {
		const hidden = violations.filter((v) => v.level !== 'error');
		if (hidden.length > 0) {
			const byRule = new Map<string, number>();
			for (const v of hidden) {
				const tag = `${v.tool}/${v.code}`;
				byRule.set(tag, (byRule.get(tag) ?? 0) + 1);
			}
			console.log(
				`\n${colors.dim}${hidden.length} warning${hidden.length > 1 ? 's' : ''} hidden (run with --warnings to show):${colors.reset}`,
			);
			for (const [tag, count] of [...byRule].sort((a, b) => b[1] - a[1])) {
				console.log(`${colors.dim}  ${count} × ${tag}${colors.reset}`);
			}
		}
	}

	printSummary(violations);
}

/** Machine-readable report for agents and CI. */
export function printJson(violations: Violation[]) {
	console.log(JSON.stringify({ summary: countByLevel(violations), violations }, null, 2));
}

// -- Main --

async function collectViolations(
	targets: string[],
	options?: { strict?: boolean },
): Promise<Violation[]> {
	// oxlint honors targets (default: project-wide); tsgo runs in project
	// mode unless the user explicitly narrowed the target set.
	const explicit = targets.length > 0;
	const results = await Promise.allSettled([
		runOxlint(explicit ? targets : ['.']),
		runKnip({ strict: options?.strict }),
		runTypeScript(explicit ? targets : []),
	]);

	const violations: Violation[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled') {
			violations.push(...result.value);
		} else {
			console.error(result.reason);
		}
	}
	return violations;
}

export async function lint(ctx: CommandContext) {
	const args = parse(ctx.args, {
		boolean: ['fix', 'strict', 'warnings'],
		string: ['format'],
	});
	const targets = args._.map(String);
	const json = args.format === 'json';
	const print = (violations: Violation[]) =>
		json ? printJson(violations) : printViolations(violations, { warnings: args.warnings });

	if (args.fix) {
		await runOxlint(targets.length > 0 ? targets : ['.'], true);

		// Report remaining
		const remaining = await collectViolations(targets, { strict: args.strict });
		if (remaining.length > 0) {
			print(remaining);
			if (remaining.some((v) => v.level === 'error')) process.exit(1);
			return;
		}
		if (!json) console.log('No issues found.');
		return;
	}

	// Default: report only
	const violations = await collectViolations(targets, { strict: args.strict });
	print(violations);
	if (violations.some((v) => v.level === 'error')) {
		process.exit(1);
	}
}
