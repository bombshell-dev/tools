import { rm } from "node:fs/promises";
import { type Plugin, build as esbuild } from "esbuild";
import type { CommandContext } from "../context.ts";
import { getPackageJSON } from "../utils.ts";

export async function build(ctx: CommandContext) {
	const { dependencies = {} } = await getPackageJSON();
	console.log('build');
	await rm("dist", { recursive: true, force: true });
	await esbuild({
		entryPoints: ["src/*", "src/**/*"],
		plugins: [ts()],
		outdir: "dist",
		platform: "node",
		format: "esm",
		sourcemap: true,
		treeShaking: true,
		target: "node20",
		minify: false,
		bundle: true,
		external: [
			"node:*",
			"cloudflare:*",
			"bun:*",
			"../*",
			"./*",
			...Object.keys(dependencies),
		],
	}).catch(() => {
		process.exit(1);
	});
}

function ts(): Plugin {
	return {
		name: "ts",
		setup(build) {
			build.onResolve({ filter: /\.tsx?$/ }, (args) => {
				return { path: args.path.replace(/\.tsx?$/, ".js"), external: true };
			});
		},
	};
}

function imports(): Plugin {
	return {
		name: "imports",
		setup(build) {
			build.onResolve({ filter: /^#clink/ }, (args) => {
				return { path: args.path.replace(/^#/, ""), external: true };
			});
		},
	};
}
