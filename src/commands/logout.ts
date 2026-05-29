import type { State } from "../state.js"
import { expireToken } from "../config.js"

export async function commandLogout(state: State, args?: string[]): Promise<void> {
  expireToken(state.config)
  console.log("\nLogged out of your MonkeyType account\n")
}