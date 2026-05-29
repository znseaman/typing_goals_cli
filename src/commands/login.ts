
import { initializeReadline, initializeReadlineHandlers, type State } from "../state.js";
import { createRequestOptions, setConfig } from "../config.js";
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
  console.log("\nLogin to your MonkeyType account\n")

  if (!args || !args.length) {
    throw new Error(`Usage: login <email>`)
  }

  const [email] = args

  // Close down the previous readline to make way for enquirer's readline
  state.readline.close()

  try {
    // @ts-ignore
    const password = await read({prompt: "Enter password: ", silent: true});

    let response = await state.monkeytype.login(email, password)
    
    if (response) {
      setConfig(response || {}, state.config)
      console.log(`\n\nSuccessfully logged you in!\n`)
    }

    // TODO: fetch tags and presets and add both lists to config
    const requestOptions = createRequestOptions(state.config, 'GET')
    const presets = await state.monkeytype.getPresets(requestOptions)

    if (presets) {
      const data = {"presets": presets?.data}
      setConfig(data, state.config)
      console.log(`\n\nSuccessfully updated your presets!\n`)
    }

    const tags = await state.monkeytype.getTags(requestOptions)

    if (tags) {
      const data = {"tags": tags?.data}
      setConfig(data, state.config)
      console.log(`\n\nSuccessfully updated your tags!\n`)
    }
  } catch (error) {
    console.error(`\n\nEncountered an error: ${error}\n`)
  } finally {
    // Re-create the previous readline and attach the necessary state to it
    state.readline = initializeReadline()
    initializeReadlineHandlers(state)
  }
}
