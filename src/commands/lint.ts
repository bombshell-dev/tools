import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";
import { local } from "../utils.ts";

// standardized `lint` command, runs `@biomejs/biome` and generates a lint report
export async function lint(ctx: CommandContext) {
	console.log("Linting with Biome");
	const stdio = x(local("biome"), ["lint", "./src"]);

	for await (const line of stdio) {
		console.log(line);
	}
}
