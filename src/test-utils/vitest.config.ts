import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: ["dist/**", "node_modules/**"],
		env: {
			FORCE_COLOR: "1",
		},
		snapshotSerializers: [fileURLToPath(import.meta.resolve("vitest-ansi-serializer"))],
	},
});
