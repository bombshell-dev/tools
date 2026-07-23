import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { x } from 'tinyexec';
import type { CommandContext } from '../context.ts';
import { local, ToolsError } from '../utils.ts';

function resolveConfig(): string {
	// Built output (.mjs) or source (.ts)
	for (const ext of ['.mjs', '.ts']) {
		const url = new URL(`../test-utils/vitest.config${ext}`, import.meta.url);
		const path = fileURLToPath(url);
		if (existsSync(path)) return path;
	}
	throw new ToolsError('Could not resolve vitest.config file', 'VITEST_CONFIG_NOT_FOUND');
}

export async function test(ctx: CommandContext) {
	const stdio = x(local('vitest'), ['run', '--config', resolveConfig(), ...ctx.args]);

	for await (const line of stdio) {
		console.log(line);
	}
}
