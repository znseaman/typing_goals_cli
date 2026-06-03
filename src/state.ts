import { stdin, stdout } from "node:process"
import { createInterface, type Interface } from "node:readline"
import { Commands, getCommands } from "./command.js";
import { MonkeyType, monkeytype } from "./monkeytype.js";
import type Conf from "conf";
import { config } from "./config.js";

export type CLICommand = {
  name: string;
  usage?: string;
  examples?: string[];
  description: string;
  execute: (state: State, args?: string[]) => Promise<void>;
}

export type State = {
  readline: Interface
  commands: Commands,
  monkeytype: MonkeyType,
  config: Conf,
  stopFullExit: boolean,
}

export function initializeState(): State {
  const readline = initializeReadline()

  const commands: Commands = getCommands();

  return {
    readline,
    commands,
    monkeytype,
    config,
    stopFullExit: false
  }
}

export function initializeReadline(): Interface {
  return createInterface({
    input: stdin,
    output: stdout,
    prompt: "> ",
  })
}

export function initializeReadlineHandlers(state: State): void {
  state.readline.on("line", async (line) => {
    const [commandName, ...args] = line.trim().split(/\s+/);
    const command = state.commands[commandName];

    if (command) {
      try {
        await command.execute(state, args);
      } catch (error) {
        console.error(`Error executing command '${commandName}':`, error);
      }
    } else {
      console.log(`\nUnknown command: '${commandName}'. Type 'help' for a list of commands.\n`);
    }

    state.readline.prompt();
  }).on("close", async () => {
    if (state.stopFullExit) return
    console.log(``)
    await state.commands["exit"].execute(state)
  })
}

// A control mechanism given only one readline can exist
// This solves for wanting to use another "readline"-like package but Node.js having limitations with readline
export async function removeReadline_runNonReadline_addReadline(state: State, handler: () => Promise<void>) {
  // Workaround to prevent natural readline from fully exiting the readline interface on close
  state.stopFullExit = true
  // Close down the previous readline to make way for enquirer's readline
  state.readline.close()
  
  try {
    await handler()
  } catch (error) {
    if ((error as Error).message !== "canceled") {
      console.log(`An error occurred: ${error}. Please try again.`)
    }
  } finally {
    // Done working with enquirer so we can allow for the native readline interface to close and do extra closing steps
    state.stopFullExit = false
    // Re-create the previous readline and attach the necessary state to it
    state.readline = initializeReadline()
    initializeReadlineHandlers(state)
  }
}