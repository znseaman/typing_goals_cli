import { startREPL } from "./repl.js";
import { initializeState } from "./state.js";

export async function main() {
  const state = initializeState();
  await startREPL(state);
}

main();