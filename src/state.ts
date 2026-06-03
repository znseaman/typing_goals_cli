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
  config: Conf
}

export function initializeState(): State {
  const readline = initializeReadline()

  const commands: Commands = getCommands();

  return {
    readline,
    commands,
    monkeytype,
    config
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
    console.log(``)
    await state.commands["exit"].execute(state)
  })
}