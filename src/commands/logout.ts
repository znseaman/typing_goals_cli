import type { State } from "../state.js"

export async function commandLogout(state: State, args?: string[]): Promise<string> {
  state.config.expireTokens()
  return `Successfully logged out of your MonkeyType account!`
}