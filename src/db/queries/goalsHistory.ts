import type { State } from "../../state.js"
import { and, desc, eq } from "drizzle-orm"
import { goalsHistory } from "../schema.js"

export type GoalsHistory = typeof goalsHistory.$inferSelect

export type GoalsHistoryInsert = {
  goalId: string
  userId: string
  date: string
  met: boolean
  name: string
  type: "time" | "count"
  measure: number
  timeframe: string
  totalMeasure: number
  failedTests: number
  resultIds: string[]
  minWpm: number | null
  maxWpm: number | null
  avgWpm: number | null
  avgAcc: number | null
  avgConsistency: number | null
}

export type GoalsHistoryQueries = {
  createGoalsHistoryEntry: (state: State, entry: GoalsHistoryInsert) => Promise<GoalsHistory>
  getGoalsHistoryByGoalId: (state: State, goalId: string) => Promise<Array<GoalsHistory>>
  getGoalsHistoryByGoalIdAndDate: (state: State, goalId: string, date: string) => Promise<GoalsHistory | undefined>
  getLatestGoalsHistoryDateForUser: (state: State) => Promise<string | undefined>
  computeStreak: (state: State, goalId: string) => Promise<number>
  deleteGoalsHistoryByUserId: (state: State) => Promise<void>
}

export async function createGoalsHistoryEntry(state: State, entry: GoalsHistoryInsert): Promise<GoalsHistory> {
  const [result] = await state.db.insert(goalsHistory).values(entry).returning()
  return result
}

export async function getGoalsHistoryByGoalId(state: State, goalId: string): Promise<Array<GoalsHistory>> {
  const userId = String(state.config.get("localId"))
  return state.db
    .select()
    .from(goalsHistory)
    .where(and(eq(goalsHistory.goalId, goalId), eq(goalsHistory.userId, userId)))
    .orderBy(goalsHistory.date)
}

export async function getGoalsHistoryByGoalIdAndDate(state: State, goalId: string, date: string): Promise<GoalsHistory | undefined> {
  const userId = String(state.config.get("localId"))
  const [result] = await state.db
    .select()
    .from(goalsHistory)
    .where(and(eq(goalsHistory.goalId, goalId), eq(goalsHistory.userId, userId), eq(goalsHistory.date, date)))
  return result
}

export async function getLatestGoalsHistoryDateForUser(state: State): Promise<string | undefined> {
  const userId = String(state.config.get("localId"))
  const [result] = await state.db
    .select({ date: goalsHistory.date })
    .from(goalsHistory)
    .where(eq(goalsHistory.userId, userId))
    .orderBy(desc(goalsHistory.date))
    .limit(1)
  return result?.date
}

export async function computeStreak(state: State, goalId: string): Promise<number> {
  const userId = String(state.config.get("localId"))
  const rows = await state.db
    .select({ date: goalsHistory.date, met: goalsHistory.met })
    .from(goalsHistory)
    .where(and(eq(goalsHistory.goalId, goalId), eq(goalsHistory.userId, userId)))
    .orderBy(desc(goalsHistory.date))

  let streak = 0
  let expectedDate: string | null = null

  for (const row of rows) {
    if (!row.met) break
    if (expectedDate !== null && row.date !== expectedDate) break
    streak++
    const d = new Date(row.date + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() - 1)
    expectedDate = d.toISOString().split("T")[0]
  }

  return streak
}

export async function deleteGoalsHistoryByUserId(state: State): Promise<void> {
  const userId = String(state.config.get("localId"))
  await state.db.delete(goalsHistory).where(eq(goalsHistory.userId, userId))
}

export default {
  createGoalsHistoryEntry,
  getGoalsHistoryByGoalId,
  getGoalsHistoryByGoalIdAndDate,
  getLatestGoalsHistoryDateForUser,
  computeStreak,
  deleteGoalsHistoryByUserId,
} as GoalsHistoryQueries
