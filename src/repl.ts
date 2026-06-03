import { isTokenValid, setConfig, createRequestOptions } from "./config.js";
import { initializeReadlineHandlers, type State } from "./state.js";
import { refreshToken } from "./monkeytype.js";

export async function startREPL(state: State) {
  const hasValidToken = isTokenValid(state.config)
  const displayName = state.config.get("displayName")
  let promptedLogin = false
  if (hasValidToken) {
    console.log(`\nWelcome back, ${displayName}!\n`);
  } else if (displayName) {
    // Try to refresh their token
    const token = String(state.config.get("refreshToken") || "")
    if (!token) {
      promptedLogin = await promptLogin(state)
    } else {
      try {
        const response = await refreshToken(token)
        
        const data = {
          "idToken": response.id_token,
          "expiresIn": response.expires_in,
          "refreshToken": response.refresh_token,
        }

        setConfig(data, state.config)
        console.log(`\nWelcome back, ${displayName}!\n`)
      } catch {
        promptedLogin = await promptLogin(state)
      }
    }
  } else {
    console.log(`\nWelcome to the Typing Goals CLI!\n`);

    promptedLogin = await promptLogin(state)
  }

  state.readline.prompt();

  // The login command already calls this function internally due to switching between native readline and read package
  if (!promptedLogin) {
    initializeReadlineHandlers(state);
  }
}

async function promptLogin(state: State): Promise<boolean> {
  try {
    await state.commands["login"].execute(state)
  } catch (error) {
    if ((error as Error).message !== "canceled") {
      console.log(`An error occurred: ${error}. Please try again.`)
    }
  } finally {
    return true
  }
}