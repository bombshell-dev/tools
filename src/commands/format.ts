import { fileURLToPath } from "node:url";
import { defineCommand } from "clink";

const config = fileURLToPath(new URL("../../oxfmtrc.json", import.meta.url));

export default defineCommand({
	async handler({ tools, remaining }) {
		await tools.exec.runOrThrow("oxfmt", ["-c", config, "./src", ...remaining], {
			stdio: "inherit",
		});
	},
});
