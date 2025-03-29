import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";

// standardized `format` command, runs `@biomejs/biome` and fixes formatting
export async function format(ctx: CommandContext) {
	console.log("Formatting with Biome");
	const stdio = x("biome", ["check", "--write", "./src"]);

	for await (const line of stdio) {
		console.log(line);
	}
}
