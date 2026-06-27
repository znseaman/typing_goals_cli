import { isProduction, type State } from "../state.js"
import { sql } from "drizzle-orm"
import { logger } from "../ui/logger.js"

export async function commandDb(state: State, args?: string[]): Promise<string> {
  const isProd = isProduction()
  if (isProd) {
    throw new Error(`This command is not allowed to be used in production!`)
  }

  logger.log("\nExecute SQL commands against your local database:\n")

  if (!args || args.length === 0) {
    return "Usage: db <sql query>";
  }

  // not safe at all and used only for testing, bobby tables 😁
  const result = await state.db.execute(sql.raw(args.join(' ')))

  return `SQL Query Result: ${JSON.stringify(result, null, 2)}`
}