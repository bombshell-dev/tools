import { fileURLToPath } from 'node:url';
import { x } from 'tinyexec';
import type { CommandContext } from '../context.ts';
import { local } from '../utils.ts';

const config = fileURLToPath(new URL('../../oxfmtrc.json', import.meta.url));

export async function format(ctx: CommandContext) {
	const result = x(local('oxfmt'), ['-c', config, ...ctx.args]);

	for await (const line of result) {
		console.info(line);
	}
	if (result.exitCode) process.exit(result.exitCode);
}
