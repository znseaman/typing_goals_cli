import { CLICommand } from "./state.js"
import { commandHelp } from "./commands/help.js"
import { commandExit } from "./commands/exit.js"
import { commandLogin } from "./commands/login.js"
import { commandLogout } from "./commands/logout.js"
import { commandConfig } from "./commands/config.js"
import { commandResults } from "./commands/results.js"
import { commandGoals } from "./commands/goals.js"

export type Commands = Record<string, CLICommand>

export function getCommands(): Commands {
  return {
    "config": {
      name: "config",
      description: "List the user configuration details",
      execute: commandConfig,
    },
    "goals": {
      name: "goals",
      description: "List the user configuration details",
      execute: commandGoals,
    },
    "login": {
      name: "login",
      description: "Login to your MonkeyType account",
      execute: commandLogin,
    },
    "logout": {
      name: "logout",
      description: "Logout of your MonkeyType account",
      execute: commandLogout,
    },
    "results": {
      name: "results",
      description: "Get today's results from your MonkeyType account",
      execute: commandResults,
    },
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