import { x } from "tinyexec";
import type { CommandContext } from "../context.ts";

// standardized `dev` command, shells out to `node --strip-types`
export async function dev(ctx: CommandContext) {
	const { args } = ctx;
	const [file = "./src/index.ts", ...rest] = args;
	// console.clear();
	console.log(
		`node --experimental-strip-types --no-warnings ${args.join(" ")}`,
	);
	const stdio = x("node", [
		"--experimental-strip-types",
		"--no-warnings",
		"--watch-path=./src/",
		file,
		...rest,
	]);
	console.log("Starting dev server...");
	console.log("Press Ctrl+C to stop the server.");

	for await (const line of stdio) {
		if (line.startsWith("Restarting")) {
			console.log(line);
			continue;
		}
		if (line.startsWith("Completed")) {
			console.log();
			continue;
		}
		console.log(line);
	}
}
