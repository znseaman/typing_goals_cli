import { styleText } from "node:util";
import Table from "cli-table3";

export const logger = {
  info: (msg: string) => console.log(`ℹ️  ${boldText(msg)}`),
  success: (msg: string) => console.log(`✅  ${styleText("green", boldText(msg))}`),
  warn: (msg: string) => console.warn(`⚠️  ${styleText("yellow", boldText(msg))}`),
  error: (msg: string) => console.error(`❌  ${styleText("red", boldText(msg))}`),
  log: (msg: string) => console.log(`${boldText(msg)}`),
  title: (msg: string) => console.log(`${styleText("yellow", boldText(msg))}`),
  table: (rows: Array<Record<string, any>>) => {
    const table = new Table({
      head: Object.keys(rows?.[0] || {}),
      style: {
        head: ['yellow', 'bold'],
      }
    })

    for (let row of rows) {
      table.push([...Object.values(row)]);
    }

    console.log(table.toString());
  }
};

export function boldText(str: string) {
  return `\x1b[1m${str}\x1b[0m`
}
