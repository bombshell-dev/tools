import { readFile, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";

export async function init(ctx: CommandContext) {
	const [_name = "."] = ctx.args;
	const cwdUrl = pathToFileURL(`${cwd()}/`);
	const name = _name === "." ? new URL("../", cwdUrl).pathname.split("/").filter(Boolean).pop()! : _name;
	const dest = new URL("./.temp/", cwdUrl);
	for await (const line of x("pnpx", ["giget@latest", "gh:bombshell-dev/template", name])) {
		console.log(line);
	}

	const promises: Promise<void>[] = [];
	for (const file of ["package.json", "README.md"]) {
		promises.push(
			postprocess(new URL(file, dest), (contents) => {
				return contents.replaceAll("$name", name);
			}),
		);
	}
	await Promise.all(promises);
}

async function postprocess(
	file: URL,
	transform: (contents: string) => string | undefined | Promise<string | undefined>,
) {
	const contents = await readFile(file, { encoding: "utf8" });
	const result = await transform(contents);
	if (!result) return;
	await writeFile(file, result, { encoding: "utf8" });
}
