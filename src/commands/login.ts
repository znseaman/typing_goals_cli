
import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { isTokenValid, setConfig } from "../config.js";
import { read } from "read";
import { createUser, getUserById } from "../db/queries/users.js";
import { savePresetsAndTags } from "./presets.js";

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

  const handler = async () => {
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
    const password = await read({prompt: "Enter password: ", silent: true, replace: "*"});
    const rememberMe = await read({prompt: "Remember Me (y/n): ", default: "y", silent: false});

    let response = await state.monkeytype.login(email, password)
    
    if (response) {
      if (rememberMe.toLowerCase() !== "y") {
        // @ts-ignore
        delete response.refreshToken
      }
      setConfig(response || {}, state.config)
      console.log(`\nWe've successfully connected your MonkeyType account!\n`)

      // save user to db
      const userId = await getUserById(state, response.localId)
      if (!userId) {
        const user = await createUser(state, response.localId, response.email, response.displayName)
        if (user) {
          console.debug(`db:createUser - ${user.id}`)
        }
      }
    }

    await savePresetsAndTags(state, false, false)
  }

  await removeReadline_runNonReadline_addReadline(state, handler)
}
