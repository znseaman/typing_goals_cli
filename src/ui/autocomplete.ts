import { stdout } from "node:process"
import type * as readlineModule from "node:readline"
import type { Commands } from "../command.js"
import type { State } from "../state.js"

export type SuggestionState = {
  suggestions: string[]
  selectedIndex: number
  numRenderedLines: number
  ghostTextVisible: boolean
}

export function createSuggestionState(): SuggestionState {
  return { suggestions: [], selectedIndex: -1, numRenderedLines: 0, ghostTextVisible: false }
}

export function clearGhostText(state: State): void {
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

export function clearSuggestions(state: State): void {
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

  const MAX_SUGGESTIONS = 10
  // Skip suggestions[0] — it's already shown as ghost text inline.
  const parts = suggestions.slice(1, MAX_SUGGESTIONS + 1).map((s, i) =>
    (i + 1) === selectedIndex ? `\x1b[7m ${s} \x1b[0m` : `\x1b[2m ${s} \x1b[0m`
  )
  stdout.write("\n\x1b[K")
  stdout.write(parts.join('  '))

  stdout.write("\x1b8")
  state.suggestionState.numRenderedLines = 1
}

export function createKeypressHandler(state: State, commandList: string[]): (str: string, key: readlineModule.Key) => void {
  return (str: string, key: readlineModule.Key): void => {
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
      state.suggestionState = createSuggestionState()
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
