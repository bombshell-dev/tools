import { fileURLToPath } from "node:url";
import { defineCommand } from "clink";

const config = fileURLToPath(new URL("../../oxlintrc.json", import.meta.url));

export default defineCommand({
  async handler({ tools, remaining }) {
    await tools.exec.runOrThrow("oxlint", ["-c", config, "./src", ...remaining], {
      stdio: "inherit",
    });
    await tools.exec.runOrThrow("publint", ["--strict"], { stdio: "inherit" });
  },
});
