import cron from "node-cron";
import { printGoalsStatus, printStreak } from "./commands/profile.js";
import { runBackfill, runDailySummary } from "./goalsSummarizer.js";
import { initializeReadlineHandlers, showPrompt, type State } from "./state.js";
import { logger } from "./ui/logger.js";
import { ensureAuthenticated } from "./auth.js";

export async function startREPL(state: State) {
  const displayName = state.config.get("displayName")
  
  if (!displayName) logger.log(`\nWelcome to the Typing Goals CLI! ⌨️\n`)
  
  const wasPromptedBeforeInitialization = await ensureAuthenticated(state, displayName)

  // if token was already valid or became valid through this flow
  if (state.config.isTokenValid()) {
    logger.log(`\nWelcome back, ${displayName}! 👋\n`)
    const requestOptions = state.config.createRequestOptions("GET")
    const streakResponse = state.config.get("maintainStreak") ? await state.monkeytype.getStreak(requestOptions) : {}
    printStreak(streakResponse)
    await printGoalsStatus(state).catch(() => {})
    runBackfill(state).catch(() => {})
    scheduleDailySummary(state)
  }

  showPrompt(state)

  // The login command already calls this function internally due to switching between native readline and read package
  if (!wasPromptedBeforeInitialization) {
    initializeReadlineHandlers(state)
  }
}

function scheduleDailySummary(state: State): void {
  cron.schedule("0 0 * * *", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    await runDailySummary(state, yesterday)
  }, { timezone: "UTC" })
}
