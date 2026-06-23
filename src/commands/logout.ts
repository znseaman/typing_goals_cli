import type { State } from "../state.js"
import { logger } from "../ui/logger.js"

export async function commandLogout(state: State, args?: string[]): Promise<void> {
  state.config.expireTokens()
  logger.success("Logged out of your MonkeyType account")
}