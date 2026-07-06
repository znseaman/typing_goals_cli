import type { State } from "./state.js";
import { logger } from "./ui/logger.js";

export async function ensureAuthenticated(state: State, displayName: unknown): Promise<boolean> {
  if (state.config.isTokenValid()) return false

  const loginHandler = () => state.commands["login"].execute(state)

  if (!displayName) {
    return await promptBeforeInitialization(loginHandler)
  }

  if (await tryRefreshToken(state)) return false

  return await promptBeforeInitialization(loginHandler)
}

async function tryRefreshToken(state: State): Promise<boolean> {
  const token = String(state.config.get("refreshToken") || "")
  if (!token) return false

  try {
    const response = await state.monkeytype.refreshToken(token)
    state.config.setConfig({
      "idToken": response.id_token,
      "expiresIn": response.expires_in,
      "refreshToken": response.refresh_token,
    })
    return true
  } catch {
    return false
  }
}

async function promptBeforeInitialization(handler: () => Promise<string | void>): Promise<boolean> {
  let output;
  try {
    output = await handler()
    if (output) {
      logger.success((output as string))
    }
  } catch (error) {
    if ((error as Error).message !== "canceled") {
      logger.error(`${(error as Error).message}. Please try again.`)
    }
  } finally {
    return true
  }
}
