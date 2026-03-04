import { defineCommand } from "clink";

export default defineCommand({
	async handler({ tools, remaining }) {
		await tools.exec.runOrThrow(
			"tsdown",
			[
				"src/bin.ts",
				"--format",
				"esm",
				"--sourcemap",
				"--clean",
				"--unbundle",
				"--no-config",
				...remaining,
			],
			{ stdio: "inherit" },
		);
	},
});
