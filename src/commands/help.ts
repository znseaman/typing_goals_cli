import { State } from "../state.js";

export async function commandHelp(state: State, args?: string[]) {
  console.log("\nAvailable commands:\n");
  for (const commandName in state.commands) {
    const command = state.commands[commandName];
    const usageOrName = command.usage ? command.usage : command.name
    console.log(`- ${usageOrName}`);
    console.log(`    ${command.description}`)
    if (command.examples) {
      console.log(`    example${command.examples.length > 1 ? "s" : ""}:`)
      for (const example of command.examples as string[]) {
        console.log(`        ${example}`)
      }
    }
    console.log("")
  }
}
