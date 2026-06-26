import { styleText } from "node:util";

export const logger = {
  info: (msg: string) => console.log(`ℹ️  ${boldText(msg)}`),
  success: (msg: string) => console.log(`✅  ${styleText("green", boldText(msg))}`),
  warn: (msg: string) => console.warn(`⚠️  ${styleText("yellow", boldText(msg))}`),
  error: (msg: string) => console.error(`❌  ${styleText("red", boldText(msg))}`),
  log: (msg: string) => console.log(`${boldText(msg)}`),
};

export function boldText(str: string) {
  return `\x1b[1m${str}\x1b[0m`
}
