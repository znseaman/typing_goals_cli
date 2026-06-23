import * as fs from "node:fs/promises"
import * as path from "node:path"
import type { State } from "../state.js"
import { logger } from "../ui/logger.js"
import { sql } from "drizzle-orm"
import { QueryResult } from "pg"

export async function commandDoctor(state: State, args?: string[]): Promise<string | void> {
  let nodeVersionFromFile = "";
  const filePath = path.join(import.meta.dirname, '..', '..', '.nvmrc')
  try {
    nodeVersionFromFile = await fs.readFile(filePath, "utf8")
  } catch {
    logger.error(`Failed to read .nvmrc file at ${filePath}. Please make sure the file exists and is readable.`)
  }

  const correctNodeVersion = nodeVersionFromFile === process.version.replace("v", "")
  logger[correctNodeVersion ? "success": "error"](`NodeJS ${nodeVersionFromFile}${correctNodeVersion ? "" : `: (Run \`nvm install ${nodeVersionFromFile} && nvm use ${nodeVersionFromFile}\`)`}`)
  
  let postgresVersionFromDB = "";
  let versionResult: QueryResult<Record<string, unknown>>
  try {
    versionResult = await state.db.execute(sql.raw(`SELECT version()`))
    postgresVersionFromDB = (versionResult.rows[0]?.version as string)?.startsWith("PostgreSQL 18") ? "18" : (versionResult.rows[0]?.version as string) || "";
  } catch {
    logger.error(`Failed to get the PostgreSQL version using the "dbURL" field in the config set as "${state.config.get("dbURL")}". Please make sure the "dbURL" field exists. To set the "dbURL", run \`config set dbURL <url>\``)
  }

  const correctPostgreSQLVersion = postgresVersionFromDB === process.env.POSTGRES_DB_VERSION
  logger[correctPostgreSQLVersion ? "success": "error"](`PostgreSQL ${postgresVersionFromDB}${correctNodeVersion ? "" : `: ${postgresVersionFromDB} was found when running SELECT version(). Revisit the pre-setup steps to setup the PostgreSQL database with docker in the README.md`}`)

  const hasValidToken = state.config.isTokenValid()
  logger[hasValidToken ? "success": "error"](`MonkeyType account for ${state.config.get("displayName") || ""}${hasValidToken ? "" : `: Type \`login\` to reconnect`}`)

  if (correctNodeVersion && correctPostgreSQLVersion && hasValidToken) {
    return `Successfully passed all basic checks!`
  }
}