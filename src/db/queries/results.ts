import type { State } from "../../state.js"
import { and, eq, gte, sql } from "drizzle-orm"

import { results } from '../schema.js'
import { ResultResponse } from "../../monkeytype.js"

export type Result = typeof results.$inferSelect

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

export async function getResultsByUserId(state: State, userId: string) {
  return state.db.select().from(results).where(eq(results.userId, userId))
}

export async function getResultsByUserIdAndAfterTimestamp(state: State, timestamp: number) {
  const userId = String(state.config.get("localId"))
  const result = await state.db.select({fullDetails: results.fullDetails}).from(results).where(and(
    eq(results.userId, userId),
    gte(sql<number>`${results.fullDetails}->>'timestamp'`, timestamp)
  ))

  if (!Array.isArray(result)) return []

  return result?.map(({fullDetails}) => fullDetails as ResultResponse)
}
