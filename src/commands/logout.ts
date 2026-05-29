import type { State } from "../state.js"
import { expireTokens } from "../config.js"

export async function commandLogout(state: State, args?: string[]): Promise<void> {
  expireTokens(state.config)
  console.log("\nLogged out of your MonkeyType account\n")
}