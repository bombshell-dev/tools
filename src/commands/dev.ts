import { x } from 'tinyexec';
import type { CommandContext } from '../context.ts';

// standardized `dev` command, shells out to `node --strip-types`
export async function dev(ctx: CommandContext) {
	const { args } = ctx;
	const [file = './src/index.ts', ...rest] = args;
	// console.clear();
	console.info(
		`node --experimental-transform-types --disable-warning=ExperimentalWarning ${args.join(' ')}`,
	);
	const stdio = x('node', [
		'--experimental-transform-types',
		'--no-warnings',
		'--watch-path=./src/',
		file,
		...rest,
	]);
	console.info('Starting dev server...');
	console.info('Press Ctrl+C to stop the server.');

	for await (const line of stdio) {
		if (line.startsWith('Restarting')) {
			console.info(line);
			continue;
		}
		if (line.startsWith('Completed')) {
			console.info();
			continue;
		}
		console.info(line);
	}
}
