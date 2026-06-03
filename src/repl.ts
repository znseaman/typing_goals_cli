import { isTokenValid, setConfig, createRequestOptions } from "./config.js";
import { initializeReadlineHandlers, type State } from "./state.js";
import { refreshToken } from "./monkeytype.js";

export async function startREPL(state: State) {
  const hasValidToken = isTokenValid(state.config)
  const displayName = state.config.get('displayName')
  if (hasValidToken) {
    console.log(`\nWelcome back, ${displayName}!\n`);
  } else if (displayName) {
    // Try to refresh their token
    const token = String(state.config.get('refreshToken') || "")
    if (!token) {
      console.log(`\nWelcome back, ${displayName}! Type "login" to reconnect.\n`);
    } else {
      try {
        const response = await refreshToken(token)
        
        const data = {
          "idToken": response.id_token,
          "expiresIn": response.expires_in,
          "refreshToken": response.refresh_token,
        }

        setConfig(data, state.config)

      } catch {
        console.log(`\nWelcome back, ${displayName}! Type "login" to reconnect.\n`);
      }
    }
  } else {
    console.log(`\nWelcome to the Typing Goals CLI! Type "login" to connect.\n`);
  }

  console.log("Type 'help' to see the available commands.\n");

  state.readline.prompt();

  initializeReadlineHandlers(state);
}
