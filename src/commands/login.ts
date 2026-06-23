
import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { read } from "read";
import { createUser, getUserById } from "../db/queries/users.js";
import { savePresetsAndTags } from "./presets.js";
import { logger } from "../ui/logger.js";

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
  const hasValidToken = state.config.isTokenValid()
  if (hasValidToken) {
    logger.info(`You're already logged into your MonkeyType account!`)
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
      state.config.setConfig(response)

      // save user to db
      const userId = await state.query.getUserById(state, response.localId)
      if (!userId) {
        const user = await state.query.createUser(state, response.localId, response.email, response.displayName)
        if (user) {
          console.debug(`db:createUser - ${user.id}`)
        }
      }

      logger.success(`Successfully connected your MonkeyType account to the CLI!`)
    }

    await savePresetsAndTags(state, false, false)
  }

  await removeReadline_runNonReadline_addReadline(state, handler)
}
