import { exit } from "node:process";
import { CLICommand, State } from "./state.js";
import { commandHelp } from "./commands/help.js";
import { commandExit } from "./commands/exit.js";

export type Commands = Record<string, CLICommand>

export function getCommands(): Commands {
    return {
        "help": {
            name: "help",
            description: "List all available commands",
            execute: commandHelp,
        },
        "exit": {
            name: "exit",
            description: "Exit the CLI",
            execute: commandExit
        }
    }
}