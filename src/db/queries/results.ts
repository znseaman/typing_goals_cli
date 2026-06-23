import type { State } from "../../state.js"
import { and, eq, gte, sql } from "drizzle-orm"

import { results } from '../schema.js'
import { ResultResponse } from "../../monkeytype.js"

export type Result = typeof results.$inferSelect

export type ResultsQueries = {
  createResult: (state: State, id: string, fullDetails: ResultResponse) => Promise<Result>,
  getResultById: (state: State, id: string) => Promise<Result>,
  getResultsByUserIdAndAfterTimestamp: (state: State, timestamp: number) => Promise<Array<ResultResponse>>,
}

export async function createResult(state: State, id: string, fullDetails: ResultResponse) {
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.insert(results).values({fullDetails, id, userId}).returning()
  return result
}

export async function getResultById(state: State, id: string) {
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.select().from(results).where(and(eq(results.userId, userId), eq(results.id, id)))
  return result
}

export async function getResultsByUserIdAndAfterTimestamp(state: State, timestamp: number) {
  const userId = String(state.config.get("localId"))
  const result = await state.db.select({fullDetails: results.fullDetails}).from(results).where(and(
    eq(results.userId, userId),
    gte(sql<number>`${results.fullDetails}->>'timestamp'`, timestamp)
  ))

  if (result.length === 0) return []

  return result?.map(({fullDetails}) => fullDetails as ResultResponse)
}

export default {
  createResult,
  getResultById,
  getResultsByUserIdAndAfterTimestamp,
} as ResultsQueries
