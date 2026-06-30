import * as fs from "node:fs/promises"
import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { logger } from "../ui/logger.js";
import { initializeDB } from "../db/index.js";

export async function commandConfig(state: State, args?: string[]): Promise<string | void> {
  if (args && args.length) {
    const [command, field, ...value] = args
    const commandRequiresField = command == "get" || command == "set" || command == "delete"
    if (commandRequiresField && !field) {
      logger.info(`Usage: config ${command} <field>`)
      return
    }
    
    const commandRequiresValue = command == "set"
    if (commandRequiresValue) {
      if (!value.join("")) {
        logger.info(`Usage: config ${command} <field> <value>`)
        return
      }
    }

    switch (command) {
      case "get":
        const result = state.config.get(field)
        if (!result && typeof result !== "boolean") {
          logger.error(`The "${field}" field does not exist in the config.`)
          return
        }
        logger.log(`${JSON.stringify(result, null, 2)}`)
        return
      case "set":
        const parsedValue = parseStringValue(value.join(""))
        try {
          state.config.set(field, parsedValue)
        } catch (error) {
          logger.error(`Unable to set the value to the "${field}" field: ${error}`)
          return
        }

        if (field === "dbURL") {
          state.db = await initializeDB(state.config)
        }

        return `Successfully set the "${field}" field in your config!`
      case "delete":
        try {
          state.config.delete(field)
        } catch (error) {
          logger.error(`Unable to delete the "${field}" field: ${error}`)
          return
        }

        if (field === "dbURL") {
          await removeReadline_runNonReadline_addReadline(state, "config", async () => {
            state.db = await initializeDB(state.config)
          })
        }

        return field === "dbURL" ? `` : `Successfully deleted the "${field}" field from your config!`
      case "path":
        logger.info(`Your config file is located: ${state.config.path}`)
        return
      default:
        logger.error(`Unknown subcommand: ${command}. Supported subcommands: get, set, delete, path.`)
        return
    }
  }

  let userConfig = "";
  try {
    userConfig = await fs.readFile(state.config.path, "utf8")
  } catch {
    logger.error(`Failed to read config file at ${state.config.path}. Please make sure the file exists and is readable.`)
  }

  let json;
  try {
    json = JSON.parse(userConfig)
  } catch {
    logger.error(`Failed to parse config file at ${state.config.path}. Please make sure the file contains valid JSON.`)
  }

  logger.info(`Path: ${state.config.path}`)
  logger.info(`User Config: ${JSON.stringify(json, null, 2)}`)
}

export function parseStringValue(value: string) {
  const trimmed = value.trim();

  // boolean and null strings
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;

  // numbers (including decimals)
  if (trimmed !== "" && !isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // JSON objects and arrays
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Fail silently to fall through to a plain string
  }

  // string
  return value;
}
