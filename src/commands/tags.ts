import { removeReadline_runNonReadline_addReadline, type State } from "../state.js"
import { createRequestOptions } from "../config.js"
import { TagResponse } from "../monkeytype.js"
import { createTag, deleteTags, getTagById } from "../db/queries/tags.js"
import { read } from "read"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish", "minBurst"]

export async function commandTags(state: State, args?: string[]): Promise<void> {
  if (args && args.length) {
    const [command] = args
    switch (command) {
      case "delete":
        try {
          await removeReadline_runNonReadline_addReadline(state, async () => {
            const confirm = await read({prompt: "Confirm to delete tags from database (y/n): ", default: "n", silent: false});
            if (confirm.toLowerCase() !== "y") return
            await deleteTags(state, String(state.config.get("localId")))
            console.log(`Successfully deleted all your tags from the database!`)
          })
        } catch (error) {
          console.error(`Unable to delete presets: ${error}`)
        }
        return
      default:
        console.error(`Unknown subcommand: ${command}. Supported subcommands: get`)
        return
    }
  }

  const requestOptions = createRequestOptions(state.config, 'GET')
  try {
    const tags = await state.monkeytype.getTags(requestOptions)

    if (tags) {
      // save presets to db
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

      // sort names alphabetically
      tags.data.sort((a: TagResponse, b: TagResponse) => a.name.localeCompare(b.name))

      let string = `Your Tags:\n`
      for (let tag of tags.data) {
        string += `- ${tag.name}\n`
      }
      console.log(string)
    }
  } catch (error) {
    console.error(`Failed to fetch tags: ${(error as Error).message}`)
  }
}