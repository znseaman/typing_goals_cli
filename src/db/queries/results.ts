import type { State } from "../../state.js"
import { and, asc, eq, gte, lt, sql } from "drizzle-orm"

import { results } from '../schema.js'
import { ResultResponse } from "../../monkeytype.js"
import { testConnection } from "../index.js"

export type Result = typeof results.$inferSelect

export type ResultsQueries = {
  createResult: (state: State, id: string, fullDetails: ResultResponse) => Promise<Result>,
  getResultById: (state: State, id: string) => Promise<Result>,
  getResultsByUserIdAndAfterTimestamp: (state: State, timestamp: number) => Promise<Array<ResultResponse>>,
  getResultsByUserIdBetweenTimestamps: (state: State, startTs: number, endTs: number) => Promise<Array<ResultResponse>>,
  getEarliestResultTimestampForUser: (state: State) => Promise<number | undefined>,
}

export async function createResult(state: State, id: string, fullDetails: ResultResponse) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.insert(results).values({fullDetails, id, userId}).returning()
  return result
}

export async function getResultById(state: State, id: string) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.select().from(results).where(and(eq(results.userId, userId), eq(results.id, id)))
  return result
}

export async function getResultsByUserIdAndAfterTimestamp(state: State, timestamp: number) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const result = await state.db.select({fullDetails: results.fullDetails}).from(results).where(and(
    eq(results.userId, userId),
    gte(sql<number>`${results.fullDetails}->>'timestamp'`, timestamp)
  ))

  if (result.length === 0) return []

  return result?.map(({fullDetails}) => fullDetails as ResultResponse)
}

export async function getResultsByUserIdBetweenTimestamps(state: State, startTs: number, endTs: number): Promise<Array<ResultResponse>> {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const result = await state.db.select({fullDetails: results.fullDetails}).from(results).where(and(
    eq(results.userId, userId),
    gte(sql<number>`(${results.fullDetails}->>'timestamp')::bigint`, startTs),
    lt(sql<number>`(${results.fullDetails}->>'timestamp')::bigint`, endTs),
  ))
  return result?.map(({fullDetails}) => fullDetails as ResultResponse) ?? []
}

export async function getEarliestResultTimestampForUser(state: State): Promise<number | undefined> {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const [oldest] = await state.db
    .select({fullDetails: results.fullDetails})
    .from(results)
    .where(eq(results.userId, userId))
    .orderBy(asc(sql`(${results.fullDetails}->>'timestamp')::bigint`))
    .limit(1)
  return oldest ? (oldest.fullDetails as ResultResponse).timestamp : undefined
}

export default {
  createResult,
  getResultById,
  getResultsByUserIdAndAfterTimestamp,
  getResultsByUserIdBetweenTimestamps,
  getEarliestResultTimestampForUser,
} as ResultsQueries
