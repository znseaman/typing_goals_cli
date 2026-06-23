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

export type PresetsQueries = {
  createPreset: (state: State, id: string, name: string, fullDetails: PresetResponse) => Promise<Preset>,
  editPresetById: (state: State, id: string, toSet: {name?: string, fullDetails?: PresetResponse}) => Promise<Preset>,
  deletePresets: (state: State) => Promise<void>,
  getPresetById: (state: State, id: string) => Promise<Preset>,
  getPresets: (state: State) => Promise<Array<PresetObject>>,
}

export async function createPreset(state: State, id: string, name: string, fullDetails: PresetResponse) {
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.insert(presets).values({fullDetails, id, name, userId}).returning()
  return result
}

export async function getPresetById(state: State, id: string) {
  const [result] = await state.db.select().from(presets).where(eq(presets.id, id))
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

export async function deletePresets(state: State) {
  const userId = String(state.config.get("localId"))
  await state.db.delete(presets).where(eq(presets.userId, userId))
}

export async function editPresetById(state: State, id: string, toSet: {name?: string, fullDetails?: PresetResponse}) {
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.update(presets).set(toSet).where(and(eq(presets.id, id), eq(presets.userId, userId))).returning()
  return result
}

export default {
  createPreset,
  editPresetById,
  deletePresets,
  getPresetById,
  getPresets,
} as PresetsQueries
