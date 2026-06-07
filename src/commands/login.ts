
import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { createRequestOptions, isTokenValid, setConfig } from "../config.js";
import { read } from "read";
import { createUser, getUserById } from "../db/queries/users.js";
import { createPreset, getPresetById } from "../db/queries/presets.js";
import { createTag, getTagById } from "../db/queries/tags.js";

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

    const requestOptions = createRequestOptions(state.config, 'GET')
    const presets = await state.monkeytype.getPresets(requestOptions)

    if (presets) {
      // save presets to db
      for await (const preset of presets?.data) {
        try {
          const exists = await getPresetById(state, preset._id)
          if (exists) continue

          const saved = await createPreset(state, preset._id, preset.name, preset, String(state.config.get("localId")))
          if (saved) {
            console.debug(`db:createPreset - ${saved.id} - ${saved.name}`)
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error(error?.message, { code: JSON.stringify(error) })
          }
        }
      }
    }

    const tags = await state.monkeytype.getTags(requestOptions)

    if (tags) {
      // save tags to db
      for await (const tag of tags?.data) {
        try {
          const exists = await getTagById(state, tag._id)
          if (exists) continue

          const saved = await createTag(state, tag._id, tag.name, tag, String(state.config.get("localId")))
          if (saved) {
            console.debug(`db:createTag - ${saved.id} - ${saved.name}`)
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error(error?.message, { code: JSON.stringify(error) })
          }
        }
      }
    }
  }

  await removeReadline_runNonReadline_addReadline(state, handler)
}
