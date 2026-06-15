import { stdin, stdout } from "node:process"
import { createInterface, type Interface } from "node:readline"
import { Commands, getCommands } from "./command.js";
import { MonkeyType, monkeytype, refreshToken } from "./monkeytype.js";
import type Conf from "conf";
import { config, isTokenValid, setConfig } from "./config.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { initializeDB } from "./db/index.js"
import { Pool } from "pg";
import 'dotenv/config'
import goals, { GoalsQueries } from "./db/queries/goals.js"
import { logger } from "./ui/logger.js";

export type CLICommand = {
  name: string;
  usage?: string;
  examples?: string[];
  description: string;
  execute: (state: State, args?: string[]) => Promise<void>;
}

export type State = {
  db: NodePgDatabase<typeof import("./db/schema.js")> & {
    $client: Pool;
  },
  readline: Interface,
  commands: Commands,
  monkeytype: MonkeyType,
  config: Conf,
  stopFullExit: boolean,
  commandHistory: string[],
  removeReadline_runNonReadline_addReadline: (state: State, handler: () => Promise<void>) => void,
  goalsQueries: GoalsQueries,
}

export async function initializeState(): Promise<State> {
  const isProd = isProduction()
  if (isProd) {
    console.debug = function(){}
  }

  const db = await initializeDB(config)

  const commands: Commands = getCommands()

  const commandHistory: string[] = []

  const readline = initializeReadline(getFullCommandList(commands), commandHistory)

  const goalsQueries = goals

  return {
    db,
    readline,
    commands,
    monkeytype,
    config,
    stopFullExit: false,
    commandHistory,
    removeReadline_runNonReadline_addReadline,
    goalsQueries
  }
}

export function initializeReadline(commandList: Array<string>, history: string[]): Interface {
  function completer (line: string) {
    const hits = commandList.filter((cmd) => cmd.startsWith(line))

    return [hits.length ? hits : commandList, line]
  }

  return createInterface({
    input: stdin,
    output: stdout,
    completer: completer,
    history: history,
    prompt: "> ",
  })
}

export function initializeReadlineHandlers(state: State): void {
  state.readline.on("line", async (line) => {
    const [commandName, ...args] = line.trim().split(/\s+/);
    const command = state.commands[commandName];

    // add command name to command history
    state.commandHistory.push(commandName)

    if (commandName !== "login") {
      // Bypass if under expires in
      if (!isTokenValid(state.config)) {
        // Try to refresh their token using refresh token
        const token = String(state.config.get("refreshToken") || "")
        if (!token) {
          logger.info(`Type "login" to reconnect.`)
          return
        }
    
        try {
          const response = await refreshToken(token)
          
          const data = {
            "idToken": response.id_token,
            "expiresIn": response.expires_in,
            "refreshToken": response.refresh_token,
          }
    
          setConfig(data, state.config)
        } catch {
          logger.info(`Type "login" to reconnect.`)
          return
        }
      }
    }

    if (command) {
      try {
        await command.execute(state, args);
      } catch (error) {
        logger.error(`Error executing command "${commandName}": ${error}`);
      }
    } else {
      logger.warn(`Unknown command: '${commandName}'. Type 'help' for a list of commands.`);
    }

    state.readline.prompt();
  }).on("close", async () => {
    if (state.stopFullExit) return
    console.log(``)
    await state.commands["exit"].execute(state)
  })
}

export async function addReadline(state: State) {
  // Done working with enquirer so we can allow for the native readline interface to close and do extra closing steps
  state.stopFullExit = false
  // Re-create the previous readline and attach the necessary state to it
  state.readline = initializeReadline(getFullCommandList(state.commands), state.commandHistory)
  initializeReadlineHandlers(state)
}

export async function removeReadline(state: State) {
  // Workaround to prevent natural readline from fully exiting the readline interface on close
  state.stopFullExit = true
  // Close down the previous readline to make way for enquirer's readline
  state.readline.close()
}

// A control mechanism given only one readline can exist
// This solves for wanting to use another "readline"-like package but Node.js having limitations with readline
export async function removeReadline_runNonReadline_addReadline(state: State, handler: () => Promise<void>) {
  removeReadline(state)
  
  try {
    await handler()
  } catch (error) {
    if ((error as Error).message !== "canceled") {
      logger.error(`An error occurred: ${error}. Please try again.`)
    }
  } finally {
    addReadline(state)
  }
}

export function isProduction(): boolean {
  return !process.env?.ENVIRONMENT ? true : process.env?.ENVIRONMENT == "prod" ? true : false
}

export function getFullCommandList(commands: Commands): Array<string> {
  const commandList: Array<string> = Object.keys(commands)

  const subCommands: Array<string> = []
  for (let command of commandList) {
    const usage = commands[command].usage
    const match = usage?.split(" ") || []

    if (!match[1]) continue

    if (isRequiredArgument(match[1])) continue
    
    const subs = match[1].replaceAll('[', '').replaceAll(']', '').split("|")
    for (const sub of subs) {
      if (isRequiredArgument(sub)) continue

      const fullSubCommand = `${command} ${sub}`
      subCommands.push(fullSubCommand)
    }
  }

  const fullCommandList = [...commandList, ...subCommands]
  return fullCommandList
}

function isRequiredArgument(str: string): boolean {
  return str.startsWith("<") && str.endsWith(">")
}