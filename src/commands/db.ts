import { isProduction, type State } from "../state.js"
import { sql } from "drizzle-orm"

export async function commandDb(state: State, args?: string[]): Promise<string> {
  const isProd = isProduction()
  if (isProd) {
    throw new Error(`This command is not allowed to be used in production!`)
  }

  console.log("\nExecute SQL commands against your local database:\n")

  // @ts-ignore
  const [...query] = args

  // not safe at all and used only for testing, bobby tables 😁
  const result = await state.db.execute(sql.raw(`${query.join(' ')}`))

  return `SQL Query Result: ${JSON.stringify(result, null, 2)}`
}