import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";
import { local } from "../utils.ts";

export async function build(ctx: CommandContext) {
	const stdio = x(local("tsdown"), [
		"src/bin.ts",
		"--format",
		"esm",
		"--sourcemap",
		"--clean",
		"--unbundle",
		"--no-config",
		...ctx.args,
	]);

	for await (const line of stdio) {
		console.log(line);
	}
}
