import { parse } from "@bomb.sh/args";
import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";
import { local } from "../utils.ts";

export async function build(ctx: CommandContext) {
	const args = parse(ctx.args, {
		boolean: ["bundle"],
	});

	const tsdownArgs = [
		"src/bin.ts",
		"--format",
		"esm",
		"--sourcemap",
		"--clean",
		"--no-config",
		...args._.map((v) => v.toString()),
	];
	if (!args.bundle) tsdownArgs.push("--unbundle");

	const stdio = x(local("tsdown"), tsdownArgs);

	for await (const line of stdio) {
		console.log(line);
	}
}
