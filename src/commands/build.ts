import { rm } from "node:fs/promises";
import { build as esbuild } from "esbuild";
import type { CommandContext } from "../context.ts";
import { getPackageJSON } from "../utils.ts";

export async function build(ctx: CommandContext) {
	const { dependencies } = await getPackageJSON();
	await rm("dist", { recursive: true, force: true });
	await esbuild({
		entryPoints: ["src/*", "src/**/*"],
		outdir: "dist",
		platform: "node",
		format: "esm",
		sourcemap: true,
		treeShaking: true,
		target: "node20",
		minify: true,
		bundle: true,
		external: ["node:*", ...Object.keys(dependencies)],
	}).catch(() => {
		process.exit(1);
	});
}
