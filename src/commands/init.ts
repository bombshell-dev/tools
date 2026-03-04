import { defineCommand } from "clink";

export default defineCommand({
	async handler({ tools, remaining }) {
		const [_name = "."] = remaining;
		const cwd = process.cwd();
		const name = _name === "." ? cwd.split("/").filter(Boolean).pop()! : _name;

		await tools.pm.execute("giget@latest", ["gh:bombshell-dev/template", name]);

		for (const file of ["package.json", "README.md"]) {
			const filePath = `.temp/${file}`;
			const contents = await tools.fs.read(filePath);
			await tools.fs.write(filePath, contents.replaceAll("$name", name));
		}
	},
});
