import { isProduction, type State } from "../state.js"
import { sql } from "drizzle-orm"

export async function commandDb(state: State, args?: string[]): Promise<void> {
  const isProd = isProduction()
  if (isProd) {
    console.log(`The "db" command is not allowed to be used in production!`)
    return
  }

  console.log("\nExecute SQL commands against your local database:\n")

  // @ts-ignore
  const [...query] = args

  // not safe at all and used only for testing, bobby tables 😁
  const result = await state.db.execute(sql.raw(`${query.join(' ')}`))

  console.log(`SQL Query Result\n`)
  console.debug(`db:rawQuery: ${JSON.stringify(result, null, 2)}\n`)
}