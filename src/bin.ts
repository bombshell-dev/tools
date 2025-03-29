import { argv } from "node:process";
import { build } from "./commands/build.ts";
import { dev } from "./commands/dev.ts";
import { format } from "./commands/format.ts";
import { init } from "./commands/init.ts";
import { lint } from "./commands/lint.ts";
import { test } from "./commands/test.ts";

const commands = { build, dev, format, init, lint, test };

async function main() {
	const [command, ...args] = argv.slice(2);

	if (!command) {
		console.log(
			`No command provided. Available commands: ${Object.keys(commands).join(", ")}\n`,
		);
		return;
	}

	const run = commands[command as keyof typeof commands];
	if (!run) {
		console.log(
			`Unknown command: ${command}. Available commands: ${Object.keys(commands).join(", ")}`,
		);
		return;
	}

	await run({ args });
}

main();
