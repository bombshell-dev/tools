import { parse } from '@bomb.sh/args';
import { build as tsdown } from 'tsdown';
import type { CommandContext } from '../context.ts';
import { printViolations } from './lint.ts';
import { runPublint } from './publint.ts';

export async function build(ctx: CommandContext) {
	const args = parse(ctx.args, {
		boolean: ['bundle', 'dts', 'minify'],
	});

	const entry = args._.length > 0 ? args._.map(String) : ['src/**/*.ts', '!src/**/*.test.ts'];

	try {
		await tsdown({
			config: false,
			entry,
			format: 'esm',
			sourcemap: true,
			clean: true,
			unbundle: !args.bundle,
			dts: args.dts === false ? false : { tsgo: true },
			minify: args.minify,
		});
	} catch (error) {
		// tsdown throws an opaque `Error: undefined Cannot find entry` when a
		// glob matches nothing — translate it into an actionable message.
		if (error instanceof Error && /Cannot find entry/.test(error.message)) {
			console.error(`No entry files matched: ${entry.join(', ')}`);
			console.error(`Looked in: ${process.cwd()}`);
			console.error('Pass explicit entry files (e.g. `bsh build src/index.ts`).');
			process.exit(1);
		}
		throw error;
	}

	// Publish gate: the freshly built dist/ must satisfy package.json
	const violations = await runPublint();
	if (violations.length > 0) {
		printViolations(violations);
	}
	if (violations.some((v) => v.level === 'error')) {
		process.exit(1);
	}
}
