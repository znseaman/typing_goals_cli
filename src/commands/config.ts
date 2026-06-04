import * as fs from "node:fs/promises"
import type { State } from "../state.js";

export async function commandConfig(state: State, args?: string[]): Promise<void> {
  if (args && args.length) {
    const [command, field, ...value] = args
    if (!field) {
      console.error(`Usage: config ${command} <field>`)
      return
    }
    switch (command) {
      case "get":
        const result = state.config.get(field)
        if (!result) {
          console.error(`The "${field}" field does not exist in the config`)
          return
        }
        console.log(`${JSON.stringify(result, null, 2)}`)
        return
      case "set":
        const parsedValue = parseStringValue(value.join(""))
        try {
          state.config.set(field, parsedValue)
        } catch (error) {
          console.error(`Unable to set value to field "${field}": ${error}`)
        }
        return
      case "delete":
        try {
          state.config.delete(field)
        } catch (error) {
          console.error(`Unable to delete field "${field}": ${error}`)
        }
        return
      default:
        console.error(`Unknown subcommand: ${command}. Supported subcommands: get`)
        break;
    }
  }

  let userConfig = "";
  try {
    userConfig = await fs.readFile(state.config.path, "utf8")
  } catch {
    console.error(`Failed to read config file at ${state.config.path}. Please make sure the file exists and is readable.`)
  }

  let json;
  try {
    json = JSON.parse(userConfig)
  } catch {
    console.error(`Failed to parse config file at ${state.config.path}. Please make sure the file contains valid JSON.`)
  }

  console.log(`\nPath: (${state.config.path}):`)
  console.log(`\nUser Config: ${JSON.stringify(json, null, 2)}`)
}

function parseStringValue(value: string) {
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
