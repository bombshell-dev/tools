import type { CommandContext } from "../context.ts";

// standardized `test` command, shells out to `node test --strip-types`
export async function test(ctx: CommandContext) {
	console.log("TODO");
}
