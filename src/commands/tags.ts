import { removeReadline_runNonReadline_addReadline, type State } from "../state.js"
import { deleteTags } from "../db/queries/tags.js"
import { read } from "read"
import { savePresetsAndTags } from "./presets.js"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish", "minBurst"]

export async function commandTags(state: State, args?: string[]): Promise<void> {
  if (args && args.length) {
    const [command] = args
    switch (command) {
      case "delete":
        try {
          await removeReadline_runNonReadline_addReadline(state, async () => {
            const confirm = await read({prompt: "Deleting your tags will also delete your goals from the database. Confirm to delete your tags and goals (y/n): ", default: "n", silent: false});
            if (confirm.toLowerCase() !== "y") return
            await deleteTags(state, String(state.config.get("localId")))
            console.log(`Successfully deleted all your tags and goals from the database!`)
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

  await savePresetsAndTags(state, false, true)
}