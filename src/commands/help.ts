import { State } from "../state.js";

export async function commandHelp(state: State, args?: string[]) {
  console.log("\nTyping Goals CLI Help\n")

  console.log("\nShortcuts:\n")
  console.log(`- Tab autocompletion: press Tab to autocomplete the entered text based on the the list of matching commands by the completer. If the command doesn't autocomplete after pressing Tab, press Tab again to show all the commands that match. The completer supports commands (i.e. results) and subcommands (i.e. goals create). For example, type "lo" + Tab and the command will autocomplete to "log". Press Tab again and the two matching commands will be output below: login and logout.\n`)

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
