import { parse } from "@bomb.sh/args";
import { build as tsdown } from "tsdown";
import type { CommandContext } from "../context.ts";

export async function build(ctx: CommandContext) {
  const args = parse(ctx.args, {
    boolean: ["bundle"],
  });

  const entry = args._.length > 0 ? args._.map(String) : ["src"];

  await tsdown({
    config: false,
    entry,
    format: "esm",
    sourcemap: true,
    clean: true,
    unbundle: !args.bundle,
  });
}
