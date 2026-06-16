import type { State } from "../state.js"

export async function commandLogout(state: State, args?: string[]): Promise<void> {
  state.config.expireTokens()
  console.log("\nLogged out of your MonkeyType account\n")
}