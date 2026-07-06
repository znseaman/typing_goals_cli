import type { State } from "./state.js"
import { computeGoalProgress, isGoalMet, type GoalWithPresetAndTag } from "./db/queries/goals.js"
import type { GoalsHistoryInsert } from "./db/queries/goalsHistory.js"
import type { ResultResponse } from "./monkeytype.js"

function getDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0]
}

function getStartOfDateString(dateStr: string): number {
  return Number(new Date(dateStr + "T00:00:00.000Z"))
}

function summarizeDayForGoal(
  goal: GoalWithPresetAndTag,
  userId: string,
  dateStr: string,
  dayResults: ResultResponse[],
): GoalsHistoryInsert {
  const tagId = goal.tagId as string
  const matchingResults = dayResults.filter(r => r.tags[0] === tagId)

  const progress = computeGoalProgress(matchingResults)
  const totalMeasure = goal.type === "count" ? progress.count : progress.totalMs
  const met = isGoalMet(goal, progress)

  const wpms = matchingResults.map(r => r.wpm)
  const minWpm = wpms.length > 0 ? Math.min(...wpms) : null
  const maxWpm = wpms.length > 0 ? Math.max(...wpms) : null
  const avgWpm = wpms.length > 0 ? wpms.reduce((a, b) => a + b, 0) / wpms.length : null
  const failedTests = matchingResults.reduce((sum, r) => sum + (r.restartCount || 0), 0)
  const n = matchingResults.length
  const avgAcc = n > 0 ? matchingResults.reduce((sum, r) => sum + r.acc, 0) / n : null
  const avgConsistency = n > 0 ? matchingResults.reduce((sum, r) => sum + r.consistency, 0) / n : null

  return {
    goalId: goal.id,
    userId,
    date: dateStr,
    met,
    name: goal.name,
    type: goal.type,
    measure: goal.measure,
    timeframe: goal.timeframe,
    totalMeasure,
    failedTests,
    resultIds: matchingResults.map(r => r._id),
    minWpm,
    maxWpm,
    avgWpm,
    avgAcc,
    avgConsistency,
  }
}

export async function runForceBackfill(state: State): Promise<void> {
  const userId = String(state.config.get("localId"))
  if (!userId || userId === "undefined") return
  await state.query.deleteGoalsHistoryByUserId(state)
  await runBackfill(state)
}

export async function runDailySummary(state: State, dateStr: string): Promise<void> {
  const userId = String(state.config.get("localId"))
  if (!userId || userId === "undefined") return

  const goals = await state.query.getGoalsByUserId(state)
  if (!goals?.length) return

  const startTs = getStartOfDateString(dateStr)
  const endTs = startTs + 24 * 60 * 60 * 1000
  const dayResults = await state.query.getResultsByUserIdBetweenTimestamps(state, startTs, endTs)

  for (const goal of goals) {
    const existing = await state.query.getGoalsHistoryByGoalIdAndDate(state, goal.id, dateStr)
    if (existing) continue
    const entry = summarizeDayForGoal(goal, userId, dateStr, dayResults)
    await state.query.createGoalsHistoryEntry(state, entry)
  }
}

export async function runBackfill(state: State): Promise<void> {
  const userId = String(state.config.get("localId"))
  if (!userId || userId === "undefined") return

  const goals = await state.query.getGoalsByUserId(state)
  if (!goals?.length) return

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const latestDate = await state.query.getLatestGoalsHistoryDateForUser(state)

  if (latestDate && latestDate >= yesterday) return

  const earliestTs = await state.query.getEarliestResultTimestampForUser(state)
  if (!earliestTs) return

  const startDateStr = latestDate
    ? (() => {
        const d = new Date(latestDate + "T00:00:00Z")
        d.setUTCDate(d.getUTCDate() + 1)
        return d.toISOString().split("T")[0]
      })()
    : getDateString(earliestTs)

  const startTs = getStartOfDateString(startDateStr)
  const endTs = getStartOfDateString(yesterday) + 24 * 60 * 60 * 1000

  const allResults = await state.query.getResultsByUserIdBetweenTimestamps(state, startTs, endTs)

  const resultsByDate = new Map<string, ResultResponse[]>()
  for (const result of allResults) {
    const dateStr = getDateString(result.timestamp)
    if (!resultsByDate.has(dateStr)) resultsByDate.set(dateStr, [])
    resultsByDate.get(dateStr)!.push(result)
  }

  const current = new Date(startDateStr + "T00:00:00Z")
  const end = new Date(yesterday + "T00:00:00Z")

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]
    const dayResults = resultsByDate.get(dateStr) ?? []

    for (const goal of goals) {
      const existing = await state.query.getGoalsHistoryByGoalIdAndDate(state, goal.id, dateStr)
      if (existing) continue
      const entry = summarizeDayForGoal(goal, userId, dateStr, dayResults)
      await state.query.createGoalsHistoryEntry(state, entry)
    }

    current.setUTCDate(current.getUTCDate() + 1)
  }
}
