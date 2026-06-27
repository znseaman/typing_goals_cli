import { State } from "../state.js";
import { logger } from "../ui/logger.js";

export async function commandHelp(state: State, args?: string[]) {
  logger.log("\nTyping Goals CLI Help 🤔\n")

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
