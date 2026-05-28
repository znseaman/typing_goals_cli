import { State } from "../state.js";

export async function commandHelp(state: State, args?: string[]) {
  console.log("\nAvailable commands:\n");
  for (const commandName in state.commands) {
    const command = state.commands[commandName];
    console.log(`- ${command.name}: ${command.description}`);
  }
  console.log("");
}
