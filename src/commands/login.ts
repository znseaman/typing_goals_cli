
import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { read } from "read";
import { savePresetsAndTags } from "./presets.js";
import { boldText, logger } from "../ui/logger.js";

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

export async function commandLogin(state: State, args?: string[]): Promise<string | void> {
  const hasValidToken = state.config.isTokenValid()
  if (hasValidToken) {
    logger.info(`You're already logged into your MonkeyType account!`)
    return
  }

  logger.log("\nLet's connect your MonkeyType account to the CLI!\n")

  const handler = async (): Promise<string | void> => {
    let email: string
    if (!args || !args.length) {
      const defaultEmail = String(state.config.get("email"))
      const options = {
        prompt: boldText("Enter email: "),
        silent: false,
        ...(defaultEmail && { default: defaultEmail }), 
      }
      email = await read(options)
    } else {
      [email] = args
    }
    const password = await read({prompt: boldText("Enter password: "), silent: true, replace: "*"});
    const rememberMe = await read({prompt: boldText("Remember me (y/n): "), default: "y", silent: false});

    let response = await state.monkeytype.login(email, password)

    if (response) {
      const configToSave = rememberMe.toLowerCase() !== "y"
        ? (({ refreshToken: _, ...rest }) => rest)(response)
        : response;
      state.config.setConfig(configToSave)

      // save user to db
      const userId = await state.query.getUserById(state, response.localId)
      if (!userId) {
        const user = await state.query.createUser(state, response.localId, response.email, response.displayName)
        if (user) {
          console.debug(`db:createUser - ${user.id}`)
        }
      }

      await savePresetsAndTags(state, false, false)

      return `Successfully connected your MonkeyType account to the CLI!`
    }
  }

  return await removeReadline_runNonReadline_addReadline(state, `login`, handler)
}
