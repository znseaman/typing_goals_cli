import type { State } from "../../state.js"
import { and, eq } from "drizzle-orm"

import { goals, presets, tags } from "../schema.js"

export type Goal = typeof goals.$inferSelect

export type GoalWithPresetAndTag = { id: string; name: string; presetId: string; presetName: string | null; tagId: string | null; timeframe: string; totalTests: number; }

// eslint-disable-next-line max-params
export async function createGoal(state: State, name: string, tagId: string, presetId: string, userId: string, timeframe: string, totalTests: number) {
  const [result] = await state.db.insert(goals).values({name, presetId, tagId, timeframe, totalTests, userId}).returning()
  return result
}

export async function getGoalsByUserId(state: State, userId: string) {
  return state.db.select(
    {id: goals.id, name: goals.name, presetId: goals.presetId, presetName: presets.name, tagId: goals.tagId, timeframe: goals.timeframe, totalTests: goals.totalTests}
  ).from(goals).leftJoin(presets, eq(goals.presetId, presets.id)).leftJoin(tags, eq(presets.name, tags.name)).where(eq(goals.userId, userId))
}

export async function getGoalByName(state: State, name: string, userId: string) {
  const result = await state.db.select().from(goals).where(and(eq(goals.name, name), eq(goals.userId, userId)))
  return result.length === 0 ? false : result[0]
}

export async function deleteGoalByName(state: State, name: string, userId: string) {
  const [result] = await state.db.delete(goals).where(and(eq(goals.name, name), eq(goals.userId, userId))).returning({ name: goals.name })
  return result
}

export async function editGoalById(state: State, id: string, userId: string, toSet: {name?: string, tagId?: string, presetId?: string, timeframe?: string, totalTests?: number}) {
  const [result] = await state.db.update(goals).set(toSet).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning({ name: goals.name })
  return result
}
