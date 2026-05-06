import { fileURLToPath } from 'node:url';
import { x } from 'tinyexec';
import type { CommandContext } from '../context.ts';
import { local } from '../utils.ts';

const config = fileURLToPath(new URL('../../oxfmtrc.json', import.meta.url));

export async function format(ctx: CommandContext) {
	const stdio = x(local('oxfmt'), ['-c', config, ...ctx.args]);

	for await (const line of stdio) {
		console.log(line);
	}
}
