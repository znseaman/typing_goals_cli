import type { State } from "../state.js"
import { createRequestOptions } from "../config.js"
import { PresetResponse } from "../monkeytype.js"
import { createPreset, getPresetById } from "../db/queries/presets.js"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish", "minBurst"]

export async function commandPresets(state: State, args?: string[]): Promise<void> {
  const requestOptions = createRequestOptions(state.config, 'GET')
  try {
    const presets = await state.monkeytype.getPresets(requestOptions)

    if (presets) {
      // save presets to db
      for await (const preset of presets?.data) {
        try {
          const exists = await getPresetById(state, preset._id)
          if (exists) continue

          const saved = await createPreset(state, preset._id, preset.name, JSON.stringify(preset, null, 0), String(state.config.get("localId")))
          if (saved) {
            console.debug(`db:createPreset - ${saved.id} - ${saved.name}`)
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error(error?.message, { code: JSON.stringify(error) })
          }
        }
      }

      // sort names alphabetically
      presets.data.sort((a: PresetResponse, b: PresetResponse) => a.name.localeCompare(b.name))

      let string = `Your Presets:\n`
      for (let preset of presets.data) {
        string += `- ${preset.name}\n`
      }
      console.log(string)
    }
  } catch (error) {
    console.error(`Failed to fetch presets: ${(error as Error).message}`)
  }
}