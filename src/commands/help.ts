import { State } from "../state.js";
import { logger } from "../ui/logger.js";

export async function commandHelp(state: State, args?: string[]) {
  logger.log("\nTyping Goals CLI Help 🤔\n")

  logger.log("Shortcuts:\n")
  logger.log(`- Tab autocompletion: press Tab to autocomplete the entered text based on the the list of matching commands by the completer. If the command doesn't autocomplete after pressing Tab, press Tab again to show all the commands that match. The completer supports commands (i.e. results) and subcommands (i.e. goals create). For example, type "lo" + Tab and the command will autocomplete to "log". Press Tab again and the two matching commands will be output below: login and logout.`)

  logger.log("Available commands:\n");
  for (const commandName in state.commands) {
    const command = state.commands[commandName];
    const usageOrName = command.usage ? command.usage : command.name
    logger.log(`- ${usageOrName}`);
    logger.log(`    ${command.description}`)
    if (command.examples) {
      logger.log(`    example${command.examples.length > 1 ? "s" : ""}:`)
      for (const example of command.examples as string[]) {
        logger.log(`        ${example}`)
      }
    }
    logger.log("")
  }
}
