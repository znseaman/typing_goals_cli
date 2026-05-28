import { exit } from "node:process";
import { CLICommand, State } from "./state.js";

export type Commands = Record<string, CLICommand>

export function getCommands(): Commands {
    return {
        "help": {
            name: "help",
            description: "List all available commands",
            execute: async (state: State, args?: string[]) => {
                console.log("\nAvailable commands:\n");
                for (const commandName in state.commands) {
                    const command = state.commands[commandName];
                    console.log(`- ${command.name}: ${command.description}`);
                }
                console.log("");
            }
        },
        "exit": {
            name: "exit",
            description: "Exit the CLI",
            execute: async (state: State, args?: string[]) => {
                console.log("\nGoodbye for now!\n");
                exit(0);
            }
        }
    }
}