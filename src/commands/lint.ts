import { fileURLToPath } from "node:url";
import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";
import { local } from "../utils.ts";

const config = fileURLToPath(new URL("../../oxlintrc.json", import.meta.url));

export async function lint(ctx: CommandContext) {
	const oxlint = x(local("oxlint"), ["-c", config, "./src", ...ctx.args]);

	for await (const line of oxlint) {
		console.log(line);
	}

	const publint = x(local("publint"), ["--strict"]);

	for await (const line of publint) {
		console.log(line);
	}
}
