import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";
import { local } from "../utils.ts";

export async function test(ctx: CommandContext) {
	const stdio = x(local("vitest"), ["run", ...ctx.args]);

	for await (const line of stdio) {
		console.log(line);
	}
}
