import * as fs from "node:fs/promises"
import type { State } from "../state.js";

export async function commandConfig(state: State, args?: string[]): Promise<void> {
  if (args && args.length) {
    const [command, field] = args
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