import { startREPL } from "./repl.js";
import { initializeState } from "./state.js";

export async function main() {
  const state = await initializeState();
  await startREPL(state);
}

main();