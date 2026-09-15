import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { x } from 'tinyexec';
import type { CommandContext } from '../context.ts';
import { local } from '../utils.ts';

const config = fileURLToPath(new URL('../../oxfmtrc.json', import.meta.url));

export async function format(ctx: CommandContext) {
	// oxfmt resolves `ignorePatterns` relative to the config file, which lives in this
	// package, so pass them as excludes to apply them to the project being formatted.
	const { ignorePatterns = [] }: { ignorePatterns?: string[] } = JSON.parse(
		await readFile(config, 'utf-8'),
	);
	const excludes = ignorePatterns.map((pattern) => `!${pattern}`);
	const result = x(local('oxfmt'), ['-c', config, ...ctx.args, ...excludes]);

	for await (const line of result) {
		console.info(line);
	}
	if (result.exitCode) process.exit(result.exitCode);
}
