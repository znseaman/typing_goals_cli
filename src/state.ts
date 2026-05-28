import { stdin, stdout } from "node:process"
import { createInterface, type Interface } from "node:readline"
import { Commands, getCommands } from "./command.js";

export type CLICommand = {
    name: string;
    description: string;
    execute: (state: State, args?: string[]) => Promise<void>;
}

export type State = {
    readline: Interface
    commands: Commands
}

export function initializeState(): State {
    const readline = createInterface({
        input: stdin,
        output: stdout,
        prompt: "> ",
    })

    const commands: Commands = getCommands();

    return {
        readline,
        commands,
    }
}
