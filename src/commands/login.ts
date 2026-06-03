
import { initializeReadline, initializeReadlineHandlers, type State } from "../state.js";
import { createRequestOptions, isTokenValid, setConfig } from "../config.js";
import { read } from "read";

export interface LoginResponse {
  displayName: string
  email: string
  expiresIn: string
  idToken: string
  kind: string
  localId: string
  profilePicture: string
  refreshToken: string
  registered: boolean
}

export async function commandLogin(state: State, args?: string[]): Promise<void> {
  const hasValidToken = isTokenValid(state.config)
  if (hasValidToken) {
    console.log(`\nYou're already logged into your MonkeyType account!\n`)
    return
  }

  console.log("\nLet's connect your MonkeyType account to the CLI!\n")

  // Workaround to prevent natural readline from fully exiting the readline interface on close
  state.stopFullExit = true
  // Close down the previous readline to make way for enquirer's readline
  state.readline.close()

  try {
    let email: string
    if (!args || !args.length) {
      // TODO: get their default if it exists in config
      const defaultEmail = String(state.config.get("email"))
      const options = {
        prompt: "Enter email: ",
        silent: false,
        ...(defaultEmail && { default: defaultEmail }), 
      }
      email = await read(options)
    } else {
      [email] = args
    }
    const password = await read({prompt: "Enter password: ", silent: true});
    const rememberMe = await read({prompt: "Remember Me (y/n): ", default: "y", silent: false});

    let response = await state.monkeytype.login(email, password)
    
    if (response) {
      if (rememberMe.toLowerCase() !== "y") {
        delete response.refreshToken
      }
      setConfig(response || {}, state.config)
      console.log(`\nWe've successfully connected your MonkeyType account!\n`)
    }

    const requestOptions = createRequestOptions(state.config, 'GET')
    const presets = await state.monkeytype.getPresets(requestOptions)

    if (presets) {
      const data = {"presets": presets?.data}
      setConfig(data, state.config)
      console.log(`\nWe've successfully updated your presets!\n`)
    }

    const tags = await state.monkeytype.getTags(requestOptions)

    if (tags) {
      const data = {"tags": tags?.data}
      setConfig(data, state.config)
      console.log(`\nSuccessfully updated your tags!\n`)
    }
  } catch (error) {
    console.error(`\nEncountered an error: ${error}\n`)
  } finally {
    // Done working with enquirer so we can allow for the native readline interface to close and do extra closing steps
    state.stopFullExit = false
    // Re-create the previous readline and attach the necessary state to it
    state.readline = initializeReadline()
    initializeReadlineHandlers(state)
  }
}
