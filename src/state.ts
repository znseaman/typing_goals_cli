import { stdin, stdout } from "node:process"
import * as readlineModule from "node:readline"
import { Commands, getCommands } from "./command.js";
import { MonkeyType, monkeytype, refreshToken } from "./monkeytype.js";
import { config, CustomConf } from "./config.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { initializeDB, testConnection } from "./db/index.js"
import { Pool } from "pg";
import 'dotenv/config'
import goals, { GoalsQueries } from "./db/queries/goals.js"
import { logger } from "./ui/logger.js";
import tags, { TagsQueries } from "./db/queries/tags.js";
import results, { ResultsQueries } from "./db/queries/results.js";
import presets, { PresetsQueries } from "./db/queries/presets.js";
import users, { UsersQueries } from "./db/queries/users.js";
import goalsHistory, { GoalsHistoryQueries } from "./db/queries/goalsHistory.js";
import { ensureAuthenticated } from "./auth.js";
import { clearGhostText, clearSuggestions, createKeypressHandler, createSuggestionState, getFullCommandList, type SuggestionState } from "./ui/autocomplete.js";

export type CLICommand = {
  name: string;
  usage?: string;
  examples?: string[];
  description: string;
  execute: (state: State, args?: string[]) => Promise<string | void>;
}

export type State = {
  db: NodePgDatabase<typeof import("./db/schema.js")> & {
    $client: Pool;
  },
  readlineModule: typeof readlineModule,
  readline: readlineModule.Interface,
  commands: Commands,
  monkeytype: MonkeyType,
  config: CustomConf,
  stopFullExit: boolean,
  commandHistory: string[],
  removeReadline_runNonReadline_addReadline: (state: State, commandName: string, handler: () => Promise<void>) => void,
  query: GoalsQueries & TagsQueries & ResultsQueries & PresetsQueries & UsersQueries & GoalsHistoryQueries,
  suggestionState: SuggestionState
  currentKeypressHandler: ((str: string, key: readlineModule.Key) => void) | null
}

export async function initializeState(): Promise<State> {
  const isProd = isProduction()
  if (isProd) {
    console.debug = function(){}
  }

  const db = await initializeDB(config)

  try {
    await testConnection(db)
  } catch (error) {
    process.stderr.write("\n")
    logger.error(`Error initializing database: ${(error as Error).message}`)
  }

  const commands: Commands = getCommands()

  await config.promptMaintainStreak()

  const commandHistory: string[] = []

  const readline = initializeReadline(commandHistory)

  let suggestionState: SuggestionState = createSuggestionState()

  const query = {
    ...goals,
    ...tags,
    ...results,
    ...presets,
    ...users,
    ...goalsHistory,
  }

  return {
    db,
    readline,
    readlineModule,
    commands,
    monkeytype,
    config,
    stopFullExit: false,
    commandHistory,
    removeReadline_runNonReadline_addReadline,
    query,
    suggestionState,
    currentKeypressHandler: null,
  }
}

export function initializeReadline(history: string[]): readlineModule.Interface {
  return readlineModule.createInterface({
    input: stdin,
    output: stdout,
    history: history,
    prompt: "❯ ",
  })
}

export function initializeReadlineHandlers(state: State): void {
  if (state.currentKeypressHandler) {
    process.stdin.removeListener("keypress", state.currentKeypressHandler)
    state.currentKeypressHandler = null
  }
  state.suggestionState = createSuggestionState()

  readlineModule.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)

  const commandList = getFullCommandList(state.commands)
  const keypressHandler = createKeypressHandler(state, commandList)

  state.currentKeypressHandler = keypressHandler
  process.stdin.prependListener("keypress", keypressHandler)

  state.readline.on("line", async (line) => {
    clearGhostText(state)
    if (state.suggestionState.numRenderedLines > 0) {
      // After Enter, the cursor is already on the suggestion line. Erase it directly
      // rather than using clearSuggestions, which assumes cursor is on the prompt line.
      stdout.write("\r\x1b[2K")
      state.suggestionState.numRenderedLines = 0
    }
    clearSuggestions(state)
    state.suggestionState = createSuggestionState()

    if (!line.trim()) {
      readlineModule.moveCursor(stdout, 0, -1)
      readlineModule.clearLine(stdout, 0)
      state.readline.prompt()
      return
    }

    const [commandName, ...args] = line.trim().split(/\s+/);
    const command = state.commands[commandName];

    // add command name to command history
    state.commandHistory.push(commandName)

    const allowCommandWithoutLogin = commandName !== "login" && commandName !== "config" && commandName !== "doctor" && commandName !== "help" && commandName !== "exit" && commandName !== "db" && (commandName in state.commands)
    if (allowCommandWithoutLogin) {
      const displayName = state.config.get("displayName")
      const wasPrompted = await ensureAuthenticated(state, displayName)
      if (wasPrompted) {
        showPrompt(state)
        return
      }
    }

    if (command) {
      try {
        const output = await command.execute(state, args);
        if (output) {
          logger.success(output)
        }
      } catch (error) {
        logger.error(`Error executing "${commandName}" command: ${(error as Error).message}`);
      }
    } else {
      logger.warn(`Unknown command: "${commandName}". Type "help" for a list of commands.`);
    }

    showPrompt(state)
  }).on("close", async () => {
    if (state.stopFullExit) return
    logger.log(``)
    await state.commands["exit"].execute(state)
  })
}

export function showPrompt(state: State) {
  stdout.write("\n")
  state.readlineModule.moveCursor(stdout, 0, -1)
  state.readline.prompt()
}

export async function addReadline(state: State) {
  // Done working with a 3rd party readline package so we can allow for the native readline interface to close and do extra closing steps
  state.stopFullExit = false
  // Re-create the previous readline and attach the necessary state to it
  state.readline = initializeReadline(state.commandHistory)
  initializeReadlineHandlers(state)
}

export async function removeReadline(state: State) {
  // Workaround to prevent natural readline from fully exiting the readline interface on close
  state.stopFullExit = true
  // Close down the previous readline to make way for a 3rd party readline package
  state.readline.close()
}

// A control mechanism given only one readline can exist
// This solves for wanting to use another "readline"-like package but Node.js having limitations with readline
export async function removeReadline_runNonReadline_addReadline(state: State, commandName: string, handler: () => Promise<string | void>) {
  removeReadline(state)

  let output;
  try {
    output = await handler()
  } catch (error) {
    if ((error as Error).message !== "canceled") {
      logger.error(`An error occurred executing "${commandName}" command: ${(error as Error).message}`);
    }
  } finally {
    addReadline(state)
    if (output) return output
  }
}

export function isProduction(): boolean {
  return !process.env?.ENVIRONMENT ? true : process.env?.ENVIRONMENT == "prod" ? true : false
}