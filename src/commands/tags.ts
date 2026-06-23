import { removeReadline_runNonReadline_addReadline, type State } from "../state.js"
import { read } from "read"
import { savePresetsAndTags } from "./presets.js"
import { logger } from "../ui/logger.js"

export const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags", "punctuation", "numbers", "mode", "quickEnd", "alwaysShowWordsHistory", "repeatQuotes", "stopOnError", "strictSpace", "indicateTypos", "compositionDisplay", "hideExtraLetters", "resultSaving", "lazyMode", "layout", "freedomMode", "codeUnindentOnBackspace", "britishEnglish", "minBurst"]

export async function commandTags(state: State, args?: string[]): Promise<string | void> {
  if (args && args.length) {
    const [subcommand] = args
    switch (subcommand) {
      case "delete":
        try {
          return await removeReadline_runNonReadline_addReadline(state, `tags ${subcommand}`, async () => {
            const confirm = await read({prompt: "Deleting your tags will also delete your goals from the database. Confirm to delete your tags and goals (y/n): ", default: "n", silent: false});
            if (confirm.toLowerCase() !== "y") return
            await state.query.deleteTags(state)
            return `Successfully deleted all your tags and goals from the database!`
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

  await savePresetsAndTags(state, false, true)
}