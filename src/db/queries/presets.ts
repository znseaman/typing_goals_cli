import type { State } from "../../state.js"
import { and, eq, sql } from "drizzle-orm"

import { goals, presets } from "../schema.js"
import { PresetResponse } from "../../monkeytype.js"

export type Preset = typeof presets.$inferSelect

export type PresetObject = {
  _id: string,
  name: string,
  tagId: string,
  config: string,
  goalName: string,
}

export async function createPreset(state: State, id: string, name: string, fullDetails: PresetResponse, userId: string) {
  const [result] = await state.db.insert(presets).values({fullDetails, id, name, userId}).returning()
  return result
}

export async function getPresetById(state: State, id: string) {
  const [result] = await state.db.select().from(presets).where(eq(presets.id, id))
  return result
}

export async function getPresetByName(state: State, userId: string, name: string) {
  const [result] = await state.db.select().from(presets).where(
    and(
      eq(presets.userId, userId),
      eq(presets.name, name)
    )
  )
  return result
}

export async function getPresets(state: State): Promise<Array<PresetObject>> {
  const userId = String(state.config.get("localId"))

  return state.db.select({
    _id: presets.id,
    name: presets.name,
    tagId: sql<string>`${presets.fullDetails}->'config'->'tags'->>0`,
    config: sql<string>`${presets.fullDetails}->>'config'`,
    goalName: goals.name,
  }).from(presets).fullJoin(goals, eq(presets.id, goals.presetId)).where(eq(presets.userId, userId)) as Promise<Array<PresetObject>>
}

export async function deletePresets(state: State, userId: string) {
  await state.db.delete(presets).where(eq(presets.userId, userId))
}
