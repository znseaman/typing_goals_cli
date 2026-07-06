import cron from "node-cron";
import { printGoalsStatus, printStreak } from "./commands/profile.js";
import { runBackfill, runDailySummary } from "./goalsSummarizer.js";
import { initializeReadlineHandlers, showPrompt, type State } from "./state.js";
import { logger } from "./ui/logger.js";

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

async function ensureAuthenticated(state: State, displayName: unknown): Promise<boolean> {
  if (state.config.isTokenValid()) return false

  const loginHandler = () => state.commands["login"].execute(state)

  if (!displayName) {
    return await promptBeforeInitialization(loginHandler)
  }

  if (await tryRefreshToken(state)) return false

  return await promptBeforeInitialization(loginHandler)
}

async function tryRefreshToken(state: State): Promise<boolean> {
  const token = String(state.config.get("refreshToken") || "")
  if (!token) return false

  try {
    const response = await state.monkeytype.refreshToken(token)
    state.config.setConfig({
      "idToken": response.id_token,
      "expiresIn": response.expires_in,
      "refreshToken": response.refresh_token,
    })
    return true
  } catch {
    return false
  }
}

async function promptBeforeInitialization(handler: () => Promise<string | void>): Promise<boolean> {
  let output; 
  try {
    output = await handler()
    if (output) {
      logger.success((output as string))
    }
  } catch (error) {
    if ((error as Error).message !== "canceled") {
      logger.error(`${(error as Error).message}. Please try again.`)
    }
  } finally {
    return true
  }
}