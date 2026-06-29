import { CLICommand } from "./state.js"
import { commandHelp } from "./commands/help.js"
import { commandExit } from "./commands/exit.js"
import { commandLogin } from "./commands/login.js"
import { commandLogout } from "./commands/logout.js"
import { commandConfig } from "./commands/config.js"
import { commandResults } from "./commands/results.js"
import { commandGoals } from "./commands/goals.js"
import { commandPresets } from "./commands/presets.js"
import { commandDb } from "./commands/db.js"
import { commandTags } from "./commands/tags.js"
import { commandClear } from "./commands/clear.js"
import { commandDoctor } from "./commands/doctor.js"
import { commandProfile } from "./commands/profile.js"

export type Commands = Record<string, CLICommand>

export function getCommands(): Commands {
  return {
    "db": {
      name: "db",
      usage: "db <sql_query>",
      description: "Test SQL queries against your database",
      examples: [
        "db select version()",
        "db select now()",
      ],
      execute: commandDb,
    },
    "clear": {
      name: "clear",
      description: "Clear the CLI",
      execute: commandClear,
    },
    "config": {
      name: "config",
      usage: "config [get|set|delete|path] [<field>] [<value>]",
      examples: [
        "config",
        "config get presets",
        "config set dbURL postgres://postgres:postgres@localhost:5432/postgres",
        "config delete expiresIn",
        "config path",
      ],
      description: "List the user configuration details",
      execute: commandConfig,
    },
    "doctor": {
      name: "doctor",
      description: "Check whether your environment appears healthy",
      execute: commandDoctor,
    },
    "goals": {
      name: "goals",
      usage: "goals [-v|create|edit|delete|history|backfill] [<name>] [<type>] [<measure>] [<presetName>]",
      examples: [
        "goals",
        "goals -v #verbose",
        "goals create",
        "goals create Normal count 2 normalW25",
        "goals edit",
        "goals delete",
        "goals history",
        "goals history Normal",
        "goals backfill",
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
      usage: "presets [delete]",
      examples: [
        "presets",
        "presets delete",
      ],
      description: "Get presets from your MonkeyType account, delete your presets from the DB",
      execute: commandPresets,
    },
    "profile": {
      name: "profile",
      description: "Display your MonkeyType profile information",
      execute: commandProfile,
    },
    "results": {
      name: "results",
      description: "Get today's results from your MonkeyType account",
      execute: commandResults,
    },
    "tags": {
      name: "tags",
      usage: "tags [delete]",
      examples: [
        "tags",
        "tags delete",
      ],
      description: "Get tags from your MonkeyType account, delete your tags from the DB",
      execute: commandTags,
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