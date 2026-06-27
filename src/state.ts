import { stdin, stdout } from "node:process"
import * as readlineModule from "node:readline"
import { Commands, getCommands } from "./command.js";
import { MonkeyType, monkeytype, refreshToken } from "./monkeytype.js";
import { config, CustomConf } from "./config.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { initializeDB } from "./db/index.js"
import { Pool } from "pg";
import 'dotenv/config'
import goals, { GoalsQueries } from "./db/queries/goals.js"
import { logger } from "./ui/logger.js";
import tags, { TagsQueries } from "./db/queries/tags.js";
import results, { ResultsQueries } from "./db/queries/results.js";
import presets, { PresetsQueries } from "./db/queries/presets.js";
import users, { UsersQueries } from "./db/queries/users.js";

export type CLICommand = {
  name: string;
  usage?: string;
  examples?: string[];
  description: string;
  execute: (state: State, args?: string[]) => Promise<string | void>;
}

type SuggestionState = {
  suggestions: string[]
  selectedIndex: number
  numRenderedLines: number
  ghostTextVisible: boolean
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
  query: GoalsQueries & TagsQueries & ResultsQueries & PresetsQueries & UsersQueries,
  suggestionState: SuggestionState
  currentKeypressHandler: ((str: string, key: readlineModule.Key) => void) | null
}

let currentKeypressHandler: ((str: string, key: readlineModule.Key) => void) | null = null

function clearGhostText(state: State): void {
  if (!state.suggestionState.ghostTextVisible) return
  stdout.write("\x1b7")
  stdout.write("\x1b[K")
  stdout.write("\x1b8")
  state.suggestionState.ghostTextVisible = false
}

function renderGhostText(state: State): void {
  const currentLine = state.readline.line
  if (!currentLine || state.suggestionState.suggestions.length === 0) return
  const ghost = state.suggestionState.suggestions[0].slice(currentLine.length)
  if (!ghost) return
  stdout.write("\x1b7")
  stdout.write(`\x1b[2m${ghost}\x1b[0m`)
  stdout.write("\x1b8")
  state.suggestionState.ghostTextVisible = true
}

function clearSuggestions(state: State): void {
  if (state.suggestionState.numRenderedLines === 0) return
  stdout.write("\x1b7")
  stdout.write("\n")
  stdout.write("\x1b[J")
  stdout.write("\x1b8")
  state.suggestionState.numRenderedLines = 0
}

function renderSuggestions(state: State): void {
  clearSuggestions(state)
  const { suggestions, selectedIndex } = state.suggestionState
  if (suggestions.length === 0) return

  const { cols: cursorCol } = state.readline.getCursorPos()

  // Pre-scroll one line; \n triggers ONLCR (\n→\r\n) on macOS so cursor lands at col 0.
  stdout.write("\n")
  stdout.write("\x1b[1A")
  if (cursorCol > 0) stdout.write(`\x1b[${cursorCol}C`)

  stdout.write("\x1b7")

  const MAX_SUGGESTIONS = 5
  // Skip suggestions[0] — it's already shown as ghost text inline.
  const parts = suggestions.slice(1, MAX_SUGGESTIONS + 1).map((s, i) =>
    (i + 1) === selectedIndex ? `\x1b[7m ${s} \x1b[0m` : `\x1b[2m ${s} \x1b[0m`
  )
  stdout.write("\n\x1b[K")
  stdout.write(parts.join('  '))

  stdout.write("\x1b8")
  state.suggestionState.numRenderedLines = 1
}

export async function initializeState(): Promise<State> {
  const isProd = isProduction()
  if (isProd) {
    console.debug = function(){}
  }

  const db = await initializeDB(config)

  const commands: Commands = getCommands()

  const commandHistory: string[] = []

  const readline = initializeReadline(commandHistory)

  let suggestionState: SuggestionState = {
    suggestions: [],
    selectedIndex: -1,
    numRenderedLines: 0,
    ghostTextVisible: false,
  }

  const query = {
    ...goals,
    ...tags,
    ...results,
    ...presets,
    ...users,
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
    currentKeypressHandler,
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
  state.suggestionState = { suggestions: [], selectedIndex: -1, numRenderedLines: 0, ghostTextVisible: false }

  readlineModule.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)

  const commandList = getFullCommandList(state.commands)

  const keypressHandler = (str: string, key: readlineModule.Key): void => {
    if (key.ctrl && key.name === "c") {
      // block full exit to prevent throwing "[ERR_USE_AFTER_CLOSE]: readline was closed" error
      // mostly occurs when user force closes from the 3rd party readline package
      if (state.stopFullExit) return

      clearGhostText(state)
      clearSuggestions(state)
      state.readline.write(null, { ctrl: true, name: "u" })
      state.readline.write("exit")
      state.readline.write(null, { name: "return" })
      return
    }

    if (key.name === "tab") {
      if (state.suggestionState.suggestions.length === 0) return
      clearGhostText(state)
      state.suggestionState.selectedIndex =
        (state.suggestionState.selectedIndex + 1) % state.suggestionState.suggestions.length
      const selected = state.suggestionState.suggestions[state.suggestionState.selectedIndex]
      // rl.write() calls _ttyWrite directly and does not re-emit keypress on stdin
      state.readline.write(null, { ctrl: true, name: "u" })
      state.readline.write(selected)
      state.suggestionState.suggestions = commandList.filter(cmd => cmd.startsWith(selected))
      if (state.suggestionState.suggestions.length === 1) {
        clearSuggestions(state)
        renderGhostText(state)
      } else {
        renderSuggestions(state)
        renderGhostText(state)
      }
      return
    }

    if (key.name === "escape") {
      clearGhostText(state)
      clearSuggestions(state)
      state.suggestionState = { suggestions: [], selectedIndex: -1, numRenderedLines: 0, ghostTextVisible: false }
      return
    }

    if (key.name === "return") {
      if (state.suggestionState.ghostTextVisible && state.suggestionState.suggestions.length > 0) {
        const ghost = state.suggestionState.suggestions[0].slice(state.readline.line.length)
        clearGhostText(state)
        // Write the remaining chars into readline's buffer before readline processes Enter.
        // readline's onkeypress fires after ours (prependListener), so it will emit "line"
        // with the completed input.
        if (ghost) state.readline.write(ghost)
      }
      return
    }

    process.nextTick(() => {
      const currentLine = state.readline.line
      clearGhostText(state)
      if (!currentLine) {
        clearSuggestions(state)
        state.suggestionState.suggestions = []
        state.suggestionState.selectedIndex = -1
        return
      }
      state.suggestionState.suggestions = commandList.filter(cmd => cmd.startsWith(currentLine))
      state.suggestionState.selectedIndex = -1
      if (state.suggestionState.suggestions.length === 1) {
        clearSuggestions(state)
        renderGhostText(state)
      } else {
        renderSuggestions(state)
        renderGhostText(state)
      }
    })
  }

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
    state.suggestionState = { suggestions: [], selectedIndex: -1, numRenderedLines: 0, ghostTextVisible: false }

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
      // Bypass if under expires in
      if (!state.config.isTokenValid()) {
        // Try to refresh their token using refresh token
        const token = String(state.config.get("refreshToken") || "")
        if (!token) {
          logger.info(`Type "login" to reconnect.`)
          showPrompt(state)
          return
        }

        try {
          const response = await state.monkeytype.refreshToken(token)

          const data = {
            "idToken": response.id_token,
            "expiresIn": response.expires_in,
            "refreshToken": response.refresh_token,
          }

          state.config.setConfig(data)
        } catch {
          logger.info(`Type "login" to reconnect.`)
          showPrompt(state)
          return
        }
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