import { removeReadline_runNonReadline_addReadline, type State } from "../state.js"
import { emojiForPresetConfigOption, PresetConfig, PresetResponse, PresetsResponse, TagResponse, TagsResponse } from "../monkeytype.js"
import { read } from "read"
import { logger } from "../ui/logger.js"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish", "minBurst"]

export async function commandPresets(state: State, args?: string[]): Promise<void> {
  if (args && args.length) {
    const [subcommand] = args
    switch (subcommand) {
      case "delete":
        try {
          await removeReadline_runNonReadline_addReadline(state, `presets ${subcommand}`, async () => {
            const confirm = await read({prompt: "Deleting your presets will also delete your goals from the database. Confirm to delete your presets and goals (y/n): ", default: "n", silent: false});
            if (confirm.toLowerCase() !== "y") return
            await state.query.deletePresets(state)
            logger.success(`Successfully deleted all your presets and goals from the database!`)
          })
        } catch (error) {
          logger.error(`Unable to delete presets: ${(error as Error)?.message}`)
        }
        return
      default:
        logger.error(`Unknown subcommand: ${subcommand}. Supported subcommands: delete`)
        return
    }
  }

  await savePresetsAndTags(state, true, false)
}

export async function savePresetsAndTags(state: State, printPresets: boolean, printTags: boolean) {
  const requestOptions = state.config.createRequestOptions("GET")

  let tags: TagsResponse = {data: [], message: ""}
  try {
    tags = await state.monkeytype.getTags(requestOptions)
    
    if (tags) {
      // save tags to db
      for await (const tag of tags?.data) {
        try {
          const exists = await state.query.getTagById(state, tag._id)
          if (exists) {
            // Update name and fullDetails
            const updated = await state.query.editTagById(state, tag._id, {name: tag.name, fullDetails: tag})
            if (updated) {
              console.debug(`db:editTagById - ${updated.id} - ${updated.name}`)
            }
            continue
          }

          const saved = await state.query.createTag(state, tag._id, tag.name, tag)
          if (saved) {
            console.debug(` db:createTag - ${saved.id} - ${saved.name}`)
          }
        } catch (error) {
          if (error instanceof Error) {
            logger.error(`${(error as Error).message}}`)
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to fetch tags: ${(error as Error).message}`)
  } 

  let presets: PresetsResponse = {data: [], message: ""}
  try {
    presets = await state.monkeytype.getPresets(requestOptions)

    if (presets) {
      // save presets to db
      for await (const preset of presets?.data) {
        try {
          const exists = await state.query.getPresetById(state, preset._id)
          if (exists) {
            // Update name and fullDetails
            const updated = await state.query.editPresetById(state, preset._id, {name: preset.name, fullDetails: preset})
            if (updated) {
              console.debug(`db:editPresetById - ${updated.id} - ${updated.name}`)
            }
            continue
          }

          // verify that there's only one tag in the preset
          if (preset?.config?.tags?.length != 1) {
            console.log(`Skipping preset "${preset.name}" due to the number of tags: ${preset?.config?.tags?.length}. There can only be one tag in a preset.`)
            continue
          }

          const tagId = preset?.config?.tags[0]

          // verify that you have this tag in the db
          let tag = await state.query.getTagById(state, tagId)
          if (!tag) {
            // if you don't have this tag, all tags from MonkeyType and verify that it exists
            const foundTag = tags?.data.filter((tag) => tag._id === tagId)

            // if this tag doesn't exist on MonkeyType, skip adding the preset (the tagId in the preset?.config?.tags shouldn't be there and you should try resetting the preset or create a new one due to data integrity)
            if (foundTag.length === 0) {
              console.log(`Skipping preset "${preset.name}" due to the tag with id "${tagId}" not existing on MonkeyType. Try re-saving your preset on MonkeyType with another tag.`)
              continue
            }
          }

          const saved = await state.query.createPreset(state, preset._id, preset.name, preset)
          if (saved) {
            console.debug(`db:createPreset - ${saved.id} - ${saved.name}`)
          }
        } catch (error) {
          if (error instanceof Error) {
            logger.error(`${(error as Error).message}}`)
          }
        }
      }
    }

    if (printPresets) {
      // sort names alphabetically
      presets.data.sort((a: PresetResponse, b: PresetResponse) => a.name.localeCompare(b.name))

      const goals = await state.query.getGoalsByUserId(state)

      const objects = []
      console.log(`\nYour Presets:`)
      for (let preset of presets.data) {
        let presetConfig = preset?.config
        let mode = presetConfig?.mode
        let modeNumber = Number(presetConfig?.words || presetConfig?.time || "")
        let goalMatchingPreset = goals.reduce((acc, curr) => {
          if (curr.presetId !== preset._id) {
            return acc
          }
          acc.push(curr.name)
          return acc
        },[] as string[])
      
        objects.push({
          name: preset.name,
          "associated goal": goalMatchingPreset.length > 0 ? `${goalMatchingPreset.join('')}` : "❌",
          [`${emojiForPresetConfigOption["language"]}`]: `${presetConfig?.language}`,
          "mode": `${mode} ${modeNumber}`,
          [`${emojiForPresetConfigOption["minWpmCustomSpeed"]}`]: presetConfig?.minWpmCustomSpeed || 0,
          [`${emojiForPresetConfigOption["minAccCustom"]}`]: presetConfig?.minAccCustom || 0,
          [`${emojiForPresetConfigOption["minBurstCustomSpeed"]}`]: presetConfig?.minBurstCustomSpeed || 0,
          [`${emojiForPresetConfigOption["blindMode"]}`]: presetConfig?.blindMode || false,
          "extra preset options": getExtraPresetOptions(presetConfig),
        })
      }

      console.table(objects, Object.keys(objects?.[0] || {}))
    }

    if (printTags) {
      // sort names alphabetically
      tags.data.sort((a: TagResponse, b: TagResponse) => a.name.localeCompare(b.name))

      const objects = []
      console.log(`\nYour Tags:`)
      for (let tag of tags.data) {
        let preset = presets?.data.find((preset) => preset?.config?.tags?.join('') === tag._id)
        let presetConfig = preset?.config
        let mode = presetConfig?.mode
        let mode2 = Number(presetConfig?.words || presetConfig?.time || "")
        let tagPersonalBests = tag?.personalBests
        let tagMatchingPreset = presets?.data.reduce((acc, curr) => {
          if (tag._id !== curr?.config?.tags?.join('')) {
            return acc
          }
          acc.push(curr.name)
          return acc
        },[] as string[])

        objects.push({
          name: tag.name,
          "associated preset": tagMatchingPreset.length > 0 ? `${tagMatchingPreset.join('')}`: "❌",
          "preset mode": mode ? `${mode} ${mode2}` : "❌",
          // @ts-ignore
          "🏆 pb": (!mode || !mode2) ? "❌" : tagPersonalBests?.[mode]?.[mode2]?.[0]?.wpm,
          // @ts-ignore
          "pb date": (!mode || !mode2) ? "❌" : new Date(tagPersonalBests?.[mode]?.[mode2]?.[0]?.timestamp).toLocaleString(),
        })
      }

      console.table(objects, Object.keys(objects?.[0] || {}))
    }
  } catch (error) {
    logger.error(`Failed to fetch presets: ${(error as Error).message}`)
  }
}

export function getExtraPresetOptions(presetConfig: PresetConfig | undefined): string {
  return presetConfig ? Object.entries(presetConfig).reduce((acc, [key, value]) => {
    if (bannedPresetOptions.includes(key)) return acc

    // suppress as they have their own columns now
    if (key === "language" || key === "mode" || key === presetConfig?.mode || key === "minWpmCustomSpeed" || key === "minAccCustom" || key === "minBurstCustomSpeed" || key === "blindMode") {
      return acc
    }

    // suppress these options if it's "custom" since it doesn't give any meaningful information about the preset
    if ((key === "minWpm" || key === "minAcc") && (value === "custom" || value === "off")) {
      return acc
    }

    // hide minBurstCustomSpeed and minBurst when minBurst is off
    if ((key === "minBurst" && value === "off") || (key === "minBurstCustomSpeed") && presetConfig?.minBurst === "off") {
      return acc
    }

    // suppress when "words" is 0
    if (key === "words" && value === 0) {
      return acc
    }

    // suppress when "time" is 0
    if (key === "time" && value === 0) {
      return acc
    }

    // suppress when "difficulty" is "normal"
    if (key === "difficulty" && value === "normal") return acc

    // suppress when "oppositeShiftMode" or "confidenceMode" is "off"
    if ((key === "oppositeShiftMode" || key === "confidenceMode") && value === "off") return acc

    const emoji: string = key == "difficulty" ? emojiForPresetConfigOption[key][value as string] || "" : emojiForPresetConfigOption[key] || ""
    const suppressValue = (key == "blindMode" || key == "confidenceMode" || key == "oppositeShiftMode")
    acc.push(`${emoji ? emoji : `${key}:`}${suppressValue ? "" : ` ${value}`}`)
    return acc
  }, [] as string[]).join(`, `) : 'N/A'
}