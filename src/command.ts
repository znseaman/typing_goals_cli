import { CLICommand } from "./state.js";
import { commandHelp } from "./commands/help.js";
import { commandExit } from "./commands/exit.js";
import { commandLogin } from "./commands/login.js";
import { commandLogout } from "./commands/logout.js";
import { commandConfig } from "./commands/config.js";

export type Commands = Record<string, CLICommand>

export function getCommands(): Commands {
  return {
    "config": {
      name: "config",
      description: "List the user configuration details",
      execute: commandConfig,
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