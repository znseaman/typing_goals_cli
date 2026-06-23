import { initializeReadlineHandlers, type State } from "./state.js";
import { logger } from "./ui/logger.js";

export async function startREPL(state: State) {
  let wasPromptedBeforeInitialization = false
  const hasValidToken = state.config.isTokenValid()
  const displayName = state.config.get("displayName")
  const loginHandler = () => state.commands["login"].execute(state)

  if (hasValidToken) {
    console.log(`\nWelcome back, ${displayName}!\n`);
  } else if (displayName) {
    // Try to refresh their token
    const token = String(state.config.get("refreshToken") || "")
    if (!token) {
      wasPromptedBeforeInitialization = await promptBeforeInitialization(loginHandler)
    } else {
      try {
        const response = await state.monkeytype.refreshToken(token)

        state.config.setConfig({
          "idToken": response.id_token,
          "expiresIn": response.expires_in,
          "refreshToken": response.refresh_token,
        })
        console.log(`\nWelcome back, ${displayName}!\n`)
      } catch {
        wasPromptedBeforeInitialization = await promptBeforeInitialization(loginHandler)
      }
    }
  } else {
    console.log(`\nWelcome to the Typing Goals CLI!\n`);

    wasPromptedBeforeInitialization = await promptBeforeInitialization(loginHandler)
  }

  state.readline.prompt();

  // The login command already calls this function internally due to switching between native readline and read package
  if (!wasPromptedBeforeInitialization) {
    initializeReadlineHandlers(state);
  }
}

async function promptBeforeInitialization(handler: () => Promise<void>): Promise<boolean> {
  try {
    await handler()
  } catch (error) {
    if ((error as Error).message !== "canceled") {
      logger.error(`${(error as Error).message}. Please try again.`)
    }
  } finally {
    return true
  }
}