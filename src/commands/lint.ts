import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";
import { local } from "../utils.ts";

export async function lint(ctx: CommandContext) {
	const oxlint = x(local("oxlint"), ["./src", ...ctx.args]);

	for await (const line of oxlint) {
		console.log(line);
	}

	const publint = x(local("publint"), ["--strict"]);

	for await (const line of publint) {
		console.log(line);
	}
}
