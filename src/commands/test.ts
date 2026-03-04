import { defineCommand } from "clink";

export default defineCommand({
	async handler({ tools, remaining }) {
		await tools.exec.runOrThrow("vitest", ["run", ...remaining], { stdio: "inherit" });
	},
});
