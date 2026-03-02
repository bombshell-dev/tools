import type { CommandContext } from "../context.ts";
import { sync } from "./env/sync.ts";

export async function env(ctx: CommandContext) {
	const [subcommand, ...subArgs] = ctx.args;

	switch (subcommand) {
		case "sync":
			await sync({ args: subArgs });
			break;
		default:
			console.log(`Unknown env subcommand: ${subcommand || "(none)"}`);
			console.log("Available subcommands: sync");
	}
}
