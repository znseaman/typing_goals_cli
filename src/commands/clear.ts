import topLevelReadline from "node:readline"
import type { State } from "../state.js"

export async function commandClear(state: State, args?: string[]): Promise<void> {
  // Move cursor to top-left corner (0, 0)
  topLevelReadline.cursorTo(process.stdout, 0, 0);
  // Clear everything from the top down
  topLevelReadline.clearScreenDown(process.stdout);
}