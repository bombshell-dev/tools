import { fileURLToPath, pathToFileURL } from "node:url";
import escalade from "escalade";

export function local(file: string) {
	return fileURLToPath(
		new URL(`../node_modules/.bin/${file}`, import.meta.url),
	);
}

export async function getPackageJSON() {
	const pkg = await escalade(fileURLToPath(import.meta.url), (dir, files) => {
		return files.find((file) => file === "package.json");
	});
	if (!pkg) {
		throw new Error("No package.json found");
	}
	const pkgPath = pathToFileURL(pkg);
	const { default: json } = await import(pkgPath.toString(), {
		with: { type: "json" },
	});
	return json;
}
