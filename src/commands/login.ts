
import { initializeReadline, initializeReadlineHandlers, type State } from "../state.js";
import { setConfig } from "../config.js";
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

    let response: LoginResponse | undefined = await state.monkeytype.login(email, password)
    
    if (response) {
      setConfig(response || {}, state.config)
      console.log(`\n\nSuccessfully logged you in!\n`)
    }
  } catch (error) {
    console.error(`\n\nEncountered an error: ${error}\n`)
  } finally {
    // Re-create the previous readline and attach the necessary state to it
    state.readline = initializeReadline()
    initializeReadlineHandlers(state)
  }
}
