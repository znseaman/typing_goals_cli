import { isTokenValid } from "./config.js";
import { initializeReadlineHandlers, type State } from "./state.js";

export async function startREPL(state: State) {
  const hasValidToken = isTokenValid(state.config)
  const displayName = state.config.get('displayName')
  if (hasValidToken) {
    console.log(`\nWelcome back, ${displayName}!\n`);
  } else if (displayName) {
    console.log(`\nWelcome back, ${displayName}! Type 'login' to reconnect.\n`);
  } else {
    console.log(`\nWelcome to the Typing Goals CLI! Type 'login' to connect.\n`);
  }

  console.log("Type 'help' to see the available commands.\n");

  state.readline.prompt();

  initializeReadlineHandlers(state);
}
