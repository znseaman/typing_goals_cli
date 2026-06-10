import type { State } from "../../state.js"
import { and, eq } from "drizzle-orm"

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

export async function getResultsByUserIdAndAfterTimestamp(state: State, userId: string, timestamp: number) {
  const result = await state.db.select({fullDetails: results.fullDetails}).from(results).where(eq(results.userId, userId))

  if (result.length === 0) return []

  return result.map(({fullDetails}) => fullDetails as ResultResponse).filter((o) => o.timestamp >= timestamp)
}

export async function getResultsByUserIdAndAfterTimestampAndTagId(state: State, userId: string, timestamp: number, tagId: string) {
  const result = await state.db.select({fullDetails: results.fullDetails}).from(results).where(eq(results.userId, userId))

  if (result.length === 0) return []

  return result.map(({fullDetails}) => fullDetails as ResultResponse).filter((o) => o.timestamp >= timestamp && o.tags && o.tags.includes(tagId))
}
