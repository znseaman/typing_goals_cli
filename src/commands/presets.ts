import type { State } from "../state.js"
import { createRequestOptions, setConfig } from "../config.js"
import { Preset } from "../monkeytype.js"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "blindMode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish"]

export async function commandPresets(state: State, args?: string[]): Promise<void> {
  const requestOptions = createRequestOptions(state.config, 'GET')
  try {
    const presets = await state.monkeytype.getPresets(requestOptions)

    if (presets) {
      // sort names alphabetically
      presets.data.sort((a: Preset, b: Preset) => a.name.localeCompare(b.name))

      const data = {"presets": presets?.data}
      setConfig(data, state.config)

      console.log(`Successfully updated your presets!\n`)

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