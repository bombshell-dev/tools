import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';
import { x } from 'tinyexec';
import type { CommandContext } from '../context.ts';

export async function init(ctx: CommandContext) {
	const [_name = '.'] = ctx.args;
	const cwdUrl = pathToFileURL(`${cwd()}/`);
	// `.` scaffolds into the current directory; otherwise clone into a new `./<name>/`.
	const inPlace = _name === '.';
	const name = inPlace ? basename(cwd()) : _name;
	const target = inPlace ? '.' : name;
	const dest = inPlace ? cwdUrl : new URL(`./${name}/`, cwdUrl);
	const gigetArgs = ['giget@latest', 'gh:bombshell-dev/template', target];
	// `--force` lets the template extract into an existing (non-empty) directory.
	if (inPlace) gigetArgs.push('--force');
	for await (const line of x('pnpx', gigetArgs)) {
		console.log(line);
	}

	const promises: Promise<void>[] = [];
	for (const file of ['package.json', 'README.md']) {
		promises.push(
			postprocess(new URL(file, dest), (contents) => {
				return contents.replaceAll('$name', name);
			}),
		);
	}
	await Promise.all(promises);
}

async function postprocess(
	file: URL,
	transform: (contents: string) => string | undefined | Promise<string | undefined>,
) {
	const contents = await readFile(file, { encoding: 'utf8' });
	const result = await transform(contents);
	if (!result) return;
	await writeFile(file, result, { encoding: 'utf8' });
}
