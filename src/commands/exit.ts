import { exit } from "node:process";
import { State } from "../state.js";

export async function commandExit(state: State, args?: string[]) {
  console.log("\nGoodbye for now!\n");
  exit(0);
}
