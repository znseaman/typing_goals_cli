import { printStreak } from "./commands/profile.js";
import { initializeReadlineHandlers, showPrompt, type State } from "./state.js";
import { logger } from "./ui/logger.js";

export async function startREPL(state: State) {
  let wasPromptedBeforeInitialization = false
  const hasValidToken = state.config.isTokenValid()
  const displayName = state.config.get("displayName")
  const loginHandler = () => state.commands["login"].execute(state)

  if (hasValidToken) {
    logger.log(`\nWelcome back, ${displayName}! 👋\n`);
    const requestOptions = state.config.createRequestOptions("GET")
    const streakResponse = state.config.get("maintainStreak") ? await state.monkeytype.getStreak(requestOptions) : {}
    printStreak(streakResponse)
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
        logger.log(`\nWelcome back, ${displayName}! 👋\n`)
        const requestOptions = state.config.createRequestOptions("GET")
        const streakResponse = state.config.get("maintainStreak") ? await state.monkeytype.getStreak(requestOptions) : {}
        printStreak(streakResponse)
      } catch {
        wasPromptedBeforeInitialization = await promptBeforeInitialization(loginHandler)
      }
    }
  } else {
    logger.log(`\nWelcome to the Typing Goals CLI! ⌨️\n`);

    wasPromptedBeforeInitialization = await promptBeforeInitialization(loginHandler)
  }

  showPrompt(state);

  // The login command already calls this function internally due to switching between native readline and read package
  if (!wasPromptedBeforeInitialization) {
    initializeReadlineHandlers(state);
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