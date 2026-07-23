import { fileURLToPath } from 'node:url';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { parse } from '@bomb.sh/args';
import { x } from 'tinyexec';
import type { JSONReport as KnipJSONReport } from 'knip';
import type { CommandContext } from '../context.ts';
import { getPublicSurface } from '../surface.ts';
import { local } from '../utils.ts';

const oxlintConfig = fileURLToPath(new URL('../../oxlintrc.json', import.meta.url));

/**
 * Rules that only apply to the public API surface (see `surface.ts`).
 * Moved from the global ruleset into `overrides` at runtime.
 */
const SURFACE_RULES = [
	'bombshell-dev/exported-function-async',
	'bombshell-dev/require-export-jsdoc',
];

/**
 * Generate the effective oxlint config for the project at `cwd`.
 *
 * Surface-scoped rules are lifted out of the shared config's global ruleset
 * and re-applied via `overrides` limited to the package's public API surface,
 * so internal modules aren't held to public-API conventions. Written into the
 * project root because oxlint resolves `overrides.files` relative to the
 * config location; deleted after the run.
 */
async function withEffectiveConfig<T>(run: (configPath: string) => Promise<T>): Promise<T> {
	const cwd = process.cwd();
	const base = JSON.parse(await readFile(oxlintConfig, 'utf-8'));
	delete base.$schema;

	// jsPlugins paths are relative to the shared config — make them absolute
	// so the generated copy can live anywhere.
	if (Array.isArray(base.jsPlugins)) {
		base.jsPlugins = base.jsPlugins.map((plugin: string) =>
			fileURLToPath(new URL(plugin, new URL('../../oxlintrc.json', import.meta.url))),
		);
	}

	const surface = await getPublicSurface(new URL(`file://${cwd}/`));
	const scoped: Record<string, unknown> = {};
	for (const rule of SURFACE_RULES) {
		if (base.rules?.[rule] !== undefined) {
			scoped[rule] = base.rules[rule];
			delete base.rules[rule];
		}
	}
	if (surface.length > 0 && Object.keys(scoped).length > 0) {
		base.overrides = [...(base.overrides ?? []), { files: surface, rules: scoped }];
	}

	const configPath = `${cwd}/.bsh.oxlintrc.json`;
	await writeFile(configPath, JSON.stringify(base, null, 2));
	try {
		return await run(configPath);
	} finally {
		await rm(configPath, { force: true });
	}
}

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
	return withEffectiveConfig(async (config) => {
		const args = ['-c', config, '--format=json', ...targets];
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
	});
}

export async function runKnip(): Promise<Violation[]> {
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
	const args =
		targets.length > 0
			? ['--noEmit', '--pretty', 'false', ...targets]
			: ['--noEmit', '--pretty', 'false'];
	const result = await x(local('tsgo'), args, { throwOnError: false });
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
	return violations;
}

// -- Output --

export function printViolations(violations: Violation[]) {
	const grouped = new Map<string, Violation[]>();
	for (const v of violations) {
		const key = v.file ?? '(project)';
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(v);
	}

	const colors = {
		error: '\x1b[31m',
		warning: '\x1b[33m',
		suggestion: '\x1b[34m',
		dim: '\x1b[2m',
		reset: '\x1b[0m',
	};

	for (const [file, items] of grouped) {
		console.log(`\n${file}`);
		for (const v of items) {
			const loc = v.line != null ? `  ${v.line}:${v.column ?? 0}` : '  -';
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
		parts.push(`${colors.error}${counts.error} error${counts.error > 1 ? 's' : ''}${colors.reset}`);
	if (counts.warning)
		parts.push(
			`${colors.warning}${counts.warning} warning${counts.warning > 1 ? 's' : ''}${colors.reset}`,
		);
	if (counts.suggestion)
		parts.push(
			`${colors.suggestion}${counts.suggestion} suggestion${counts.suggestion > 1 ? 's' : ''}${colors.reset}`,
		);
	if (parts.length > 0) {
		console.log(`\n${parts.join(', ')}`);
	} else {
		console.log('\nNo issues found.');
	}
}

// -- Main --

async function collectViolations(targets: string[]): Promise<Violation[]> {
	const results = await Promise.allSettled([runOxlint(targets), runKnip(), runTypeScript(targets)]);

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
		boolean: ['fix'],
	});
	const targets = args._.length > 0 ? args._.map(String) : ['./src'];

	if (args.fix) {
		await runOxlint(targets, true);

		// Report remaining
		const remaining = await collectViolations(targets);
		if (remaining.length > 0) {
			printViolations(remaining);
			process.exit(1);
		}
		console.log('No issues found.');
		return;
	}

	// Default: report only
	const violations = await collectViolations(targets);
	printViolations(violations);
	if (violations.some((v) => v.level === 'error')) {
		process.exit(1);
	}
}
