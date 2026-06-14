import { removeReadline_runNonReadline_addReadline, type State } from "../state.js"
import { createRequestOptions } from "../config.js"
import { PresetResponse, PresetsResponse, TagResponse, TagsResponse } from "../monkeytype.js"
import { createPreset, deletePresets, getPresetById } from "../db/queries/presets.js"
import { read } from "read"
import { createTag, getTagById } from "../db/queries/tags.js"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish", "minBurst"]

export async function commandPresets(state: State, args?: string[]): Promise<void> {
  if (args && args.length) {
    const [command] = args
    switch (command) {
      case "delete":
        try {
          await removeReadline_runNonReadline_addReadline(state, async () => {
            const confirm = await read({prompt: "Deleting your presets will also delete your goals from the database. Confirm to delete your presets and goals (y/n): ", default: "n", silent: false});
            if (confirm.toLowerCase() !== "y") return
            await deletePresets(state, String(state.config.get("localId")))
            console.log(`Successfully deleted all your presets and goals from the database!`)
          })
        } catch (error) {
          console.error(`Unable to delete presets: ${error}`)
        }
        return
      default:
        console.error(`Unknown subcommand: ${command}. Supported subcommands: delete`)
        return
    }
  }

  await savePresetsAndTags(state, true, false)
}

export async function savePresetsAndTags(state: State, printPresets: boolean, printTags: boolean) {
  const requestOptions = createRequestOptions(state.config, 'GET')

  let tags: TagsResponse = {data: [], message: ""}
  try {
    tags = await state.monkeytype.getTags(requestOptions)
    
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
  } catch (error) {
    console.error(`Failed to fetch tags: ${(error as Error).message}`)
  } 

  let presets: PresetsResponse = {data: [], message: ""}
  try {
    presets = await state.monkeytype.getPresets(requestOptions)

    if (presets) {
      // save presets to db
      for await (const preset of presets?.data) {
        try {
          const exists = await getPresetById(state, preset._id)
          if (exists) continue

          // verify that there's only one tag in the preset
          if (preset?.config?.tags?.length != 1) {
            console.log(`Skipping preset "${preset.name}" due to the number of tags: ${preset?.config?.tags?.length}. There can only be one tag in a preset.`)
            continue
          }

          const tagId = preset?.config?.tags[0]

          // verify that you have this tag in the db
          let tag = await getTagById(state, tagId)
          if (!tag) {
            // if you don't have this tag, all tags from MonkeyType and verify that it exists
            const foundTag = tags?.data.filter((tag) => tag._id === tagId)

            // if this tag doesn't exist on MonkeyType, skip adding the preset (the tagId in the preset?.config?.tags shouldn't be there and you should try resetting the preset or create a new one due to data integrity)
            if (foundTag.length === 0) {
              console.log(`Skipping preset "${preset.name}" due to the tag with id "${tagId}" not existing on MonkeyType. Try re-saving your preset on MonkeyType with another tag.`)
              continue
            }
          }

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

    if (printPresets) {
      // sort names alphabetically
      presets.data.sort((a: PresetResponse, b: PresetResponse) => a.name.localeCompare(b.name))

      let string = `\nYour Presets:\n`
      for (let preset of presets.data) {
        string += `- ${preset.name}\n`
      }
      console.log(string)
    }

    if (printTags) {
      // sort names alphabetically
      tags.data.sort((a: TagResponse, b: TagResponse) => a.name.localeCompare(b.name))

      let string = `\nYour Tags:\n`
      for (let tag of tags.data) {
        string += `- ${tag.name}\n`
      }
      console.log(string)
    }
  } catch (error) {
    console.error(`Failed to fetch presets: ${(error as Error).message}`)
  }
}