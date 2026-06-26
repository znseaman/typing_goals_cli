import { exit } from "node:process";
import { State } from "../state.js";
import { logger } from "../ui/logger.js";

export async function commandExit(state: State, args?: string[]) {
  logger.log("\nGoodbye for now! 👋\n");
  exit(0);
}
