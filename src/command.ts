import { CLICommand } from "./state.js"
import { commandHelp } from "./commands/help.js"
import { commandExit } from "./commands/exit.js"
import { commandLogin } from "./commands/login.js"
import { commandLogout } from "./commands/logout.js"
import { commandConfig } from "./commands/config.js"
import { commandResults } from "./commands/results.js"
import { commandGoals } from "./commands/goals.js"
import { commandPresets } from "./commands/presets.js"

export type Commands = Record<string, CLICommand>

export function getCommands(): Commands {
  return {
    "config": {
      name: "config",
      usage: "config [get|set|delete] [<field>] [<value>]",
      examples: [
        "config",
        "config get presets",
        "config set dbURL postgres://username:password@localhost:5432/typing_goals_cli",
        "config delete expiresIn"
      ],
      description: "List the user configuration details",
      execute: commandConfig,
    },
    "goals": {
      name: "goals",
      usage: "goals [-v|create|edit|delete]",
      examples: [
        "goals",
        "goals -v #verbose",
        "goals create",
        "goals edit",
        "goals delete",
      ],
      description: "List all user-created goals or create / edit / delete a goal",
      execute: commandGoals,
    },
    "login": {
      name: "login",
      usage: "login [<email>]",
      examples: [
        "login bob@example.com",
      ],
      description: "Login to your MonkeyType account",
      execute: commandLogin,
    },
    "logout": {
      name: "logout",
      description: "Logout of your MonkeyType account",
      execute: commandLogout,
    },
    "presets": {
      name: "presets",
      description: "Get presets from your MonkeyType account",
      execute: commandPresets,
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