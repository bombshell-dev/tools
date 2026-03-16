import { fileURLToPath } from "node:url";

export function local(file: string) {
  return fileURLToPath(new URL(`../node_modules/.bin/${file}`, import.meta.url));
}
