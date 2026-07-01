import { createInterface } from "node:readline"
import { removeReadline_runNonReadline_addReadline, type State } from "../state.js"
import { emojiForPresetConfigOption, getFieldsFromConfig, presetResponseSchema, PresetConfig, PresetResponse, PresetsResponse, TagResponse, TagsResponse } from "../monkeytype.js"
import { read } from "read"
import { logger } from "../ui/logger.js"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish", "minBurst"]

export const PRESET_TEMPLATES: Array<Pick<PresetResponse, 'name' | 'config' | 'settingGroups'>> = [
  {
    name: "accuracyW25",
    config: { punctuation: true, numbers: true, words: 25, time: 0, mode: "words", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "master", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: false, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 70, minAcc: "custom", minAccCustom: 100, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: true, oppositeShiftMode: "on", stopOnError: "off", confidenceMode: "off", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "adaptabilityW25",
    config: { punctuation: true, numbers: true, words: 25, time: 0, mode: "words", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "expert", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: false, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 70, minAcc: "off", minAccCustom: 96, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "off", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "consistencyW25",
    config: { punctuation: true, numbers: true, words: 25, time: 0, mode: "words", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: true, alwaysShowWordsHistory: true, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 75, minAcc: "off", minAccCustom: 96, minBurst: "fixed", minBurstCustomSpeed: 40, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "on", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "javascript",
    config: { punctuation: true, numbers: true, words: 25, time: 0, mode: "words", quoteLength: [1], language: "code_javascript", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: false, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 40, minAcc: "off", minAccCustom: 96, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "off", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "normalW25",
    config: { punctuation: true, numbers: true, words: 25, time: 0, mode: "words", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: false, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "off", minWpmCustomSpeed: 100, minAcc: "custom", minAccCustom: 95, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "off", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "powerW25",
    config: { punctuation: true, numbers: true, words: 25, time: 0, mode: "words", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: true, alwaysShowWordsHistory: true, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 80, minAcc: "off", minAccCustom: 0, minBurst: "fixed", minBurstCustomSpeed: 40, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "max", quickEnd: true, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "speedW25",
    config: { punctuation: true, numbers: true, words: 25, time: 0, mode: "words", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: true, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 90, minAcc: "off", minAccCustom: 96, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "on", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "T15",
    config: { punctuation: false, numbers: false, words: 0, time: 15, mode: "time", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: true, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 80, minAcc: "off", minAccCustom: 96, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "on", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "T30",
    config: { punctuation: false, numbers: false, words: 0, time: 30, mode: "time", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: true, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 80, minAcc: "custom", minAccCustom: 96, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "on", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
  {
    name: "T60",
    config: { punctuation: false, numbers: false, words: 0, time: 60, mode: "time", quoteLength: [1], language: "english", burstHeatmap: true, difficulty: "normal", quickRestart: "esc", repeatQuotes: "off", resultSaving: true, blindMode: true, alwaysShowWordsHistory: false, singleListCommandLine: "manual", minWpm: "custom", minWpmCustomSpeed: 80, minAcc: "off", minAccCustom: 96, minBurst: "off", minBurstCustomSpeed: 100, britishEnglish: false, funbox: [], customLayoutfluid: ["qwerty", "dvorak", "colemak"], customPolyglot: ["english", "spanish", "french", "german"], freedomMode: false, strictSpace: false, oppositeShiftMode: "off", stopOnError: "off", confidenceMode: "on", quickEnd: false, indicateTypos: "off", compositionDisplay: "replace", hideExtraLetters: false, lazyMode: false, layout: "default", codeUnindentOnBackspace: false, tags: [] },
    settingGroups: ["test", "behavior", "input"],
  },
]

export async function commandPresets(state: State, args?: string[]): Promise<string | void> {
  if (args && args.length) {
    const [subcommand] = args
    switch (subcommand) {
      case "create":
        try {
          return await removeReadline_runNonReadline_addReadline(state, `presets ${subcommand}`, async () => {
            const PRESET_TYPES = [
              "accuracy", "adaptability", "consistency", "javascript", "normal",
              "power", "speed", "time 15", "time 30", "time 60", "custom",
            ] as const
            const PRESET_TYPE_TO_NAME: Record<string, string> = {
              "accuracy":     "accuracyW25",
              "adaptability": "adaptabilityW25",
              "consistency":  "consistencyW25",
              "javascript":   "javascript",
              "normal":       "normalW25",
              "power":        "powerW25",
              "speed":        "speedW25",
              "time 15":      "T15",
              "time 30":      "T30",
              "time 60":      "T60",
            }

            const name = await read({ prompt: "Preset name: ", silent: false })
            const presetType = await read({ prompt: `Preset type [${PRESET_TYPES.join("/")}]: `, silent: false })

            if (!(PRESET_TYPES as readonly string[]).includes(presetType)) {
              logger.error(`Invalid preset type "${presetType}". Valid types: ${PRESET_TYPES.join(", ")}`)
              return
            }

            const postOptions = state.config.createRequestOptions("POST")
            let config: PresetConfig
            let settingGroups: unknown

            if (presetType === "custom") {
              logger.log(`Paste your JSON payload, then press Enter on an empty line:`)
              if (process.stdin.isTTY) process.stdin.setRawMode(false)
              const raw = await new Promise<string>((resolve) => {
                const rl = createInterface({ input: process.stdin, output: process.stdout })
                const lines: string[] = []
                rl.on("line", (line) => {
                  if (line === "" && lines.length > 0) {
                    rl.close()
                    resolve(lines.join("\n"))
                  } else {
                    lines.push(line)
                  }
                })
              })
              let payload: { config?: PresetConfig; settingGroups?: unknown }
              try {
                payload = JSON.parse(raw)
              } catch {
                logger.error(`Invalid JSON payload.`)
                return
              }
              config = payload.config ?? {}
              settingGroups = payload.settingGroups
            } else {
              const tagName = await read({ prompt: "Tag name: ", silent: false })

              const templatePreset = PRESET_TEMPLATES.find(p => p.name === PRESET_TYPE_TO_NAME[presetType])
              if (!templatePreset) {
                logger.error(`Could not find a preset template for type "${presetType}".`)
                return
              }

              const getOptions = state.config.createRequestOptions("GET")
              const tagsResponse = await state.monkeytype.getTags(getOptions)
              let tagId = tagsResponse.data.find(t => t.name === tagName)?._id
              if (!tagId) {
                const created = await state.monkeytype.postTag(tagName, postOptions)
                tagId = created.data._id
                await state.query.createTag(state, tagId, tagName, created.data as TagResponse)
              }

              config = { ...templatePreset.config, tags: [tagId] }
              settingGroups = templatePreset.settingGroups
            }

            const result = await state.monkeytype.postPreset(name, config, settingGroups, postOptions)
            await state.query.createPreset(state, result.data.presetId, name, {
              _id: result.data.presetId,
              name,
              config,
              settingGroups,
            })
            return `${result.message} (id: ${result.data.presetId})`
          })
        } catch (error) {
          logger.error(`Unable to create preset: ${(error as Error)?.message}`)
        }
        return
      case "delete":
        try {
          return await removeReadline_runNonReadline_addReadline(state, `presets ${subcommand}`, async () => {
            const confirm = await read({prompt: "Deleting your presets will also delete your goals from the database. Confirm to delete your presets and goals (y/n): ", default: "n", silent: false});
            if (confirm.toLowerCase() !== "y") return
            await state.query.deletePresets(state)
            return `Successfully deleted all your presets and goals from the database!`
          })
        } catch (error) {
          logger.error(`Unable to delete presets: ${(error as Error)?.message}`)
        }
        return
      default:
        logger.error(`Unknown subcommand: ${subcommand}. Supported subcommands: create, delete`)
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
            logger.warn(`Skipping preset "${preset.name}" due to the number of tags: ${preset?.config?.tags?.length}. There can only be one tag in a preset.`)
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
              logger.log(`Skipping preset "${preset.name}" due to the tag with id "${tagId}" not existing on MonkeyType. Try re-saving your preset on MonkeyType with another tag.`)
              continue
            }
          }

          const validation = presetResponseSchema.safeParse(preset)
          if (!validation.success) {
            logger.warn(`Skipping preset "${preset.name}" due to a validation failure: ${validation.error.message}`)
            continue
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

      logger.title(`\nYour Presets 🔧`)
      logger.table(objects)
    }

    if (printTags) {
      // sort names alphabetically
      tags.data.sort((a: TagResponse, b: TagResponse) => a.name.localeCompare(b.name))

      const objects = []
      for (let tag of tags.data) {
        let preset = presets?.data.find((preset) => preset?.config?.tags?.join('') === tag._id)
        let presetConfig = preset?.config
        let tagPersonalBests = tag?.personalBests
        let tagMatchingPreset = presets?.data.reduce((acc, curr) => {
          if (tag._id !== curr?.config?.tags?.join('')) {
            return acc
          }
          acc.push(curr.name)
          return acc
        },[] as string[])

        const { pb, mode, mode2 } = getFieldsFromConfig(presetConfig, tagPersonalBests);

        objects.push({
          name: tag.name,
          "associated preset": tagMatchingPreset.length > 0 ? `${tagMatchingPreset.join('')}`: "❌",
          "preset mode": mode && mode2 ? `${mode} ${mode2}` : "❌",
          "🏆 pb": pb?.wpm ?? "❌",
          "pb date": pb ? new Date(pb.timestamp).toLocaleString() : "❌",
        })
      }

      logger.title(`\nYour Tags 🏷️`)
      logger.table(objects)
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