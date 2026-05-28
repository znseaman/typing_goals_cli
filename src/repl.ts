import { type State } from "./state.js";

export async function startREPL(state: State) {
  console.log("\nWelcome to the Typing Goals CLI!\n");
  console.log("Type 'help' to see the available commands.\n");

  state.readline.prompt();

  state.readline.on("line", async (line) => {
    const [commandName, ...args] = line.trim().split(/\s+/);
    const command = state.commands[commandName];

    if (command) {
      try {
        await command.execute(state, args);
      } catch (error) {
        console.error(`Error executing command '${commandName}':`, error);
      }
    } else {
      console.log(`\nUnknown command: '${commandName}'. Type 'help' for a list of commands.\n`);
    }

    state.readline.prompt();
  }).on("close", async () => {
    await state.commands["exit"].execute(state);
  });
}
