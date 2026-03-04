import { defineCommand } from "clink";

export default defineCommand({
	async handler({ tools, remaining }) {
		const [file = "./src/index.ts", ...rest] = remaining;
		console.log(
			`node --experimental-transform-types --disable-warning=ExperimentalWarning ${remaining.join(" ")}`,
		);
		console.log("Starting dev server...");
		console.log("Press Ctrl+C to stop the server.");

		const stdio = tools.exec.stream("node", [
			"--experimental-transform-types",
			"--no-warnings",
			"--watch-path=./src/",
			file,
			...rest,
		]);

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
	},
});
