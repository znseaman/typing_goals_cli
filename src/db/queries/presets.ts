import type { State } from "../../state.js"
import { and, eq } from "drizzle-orm"

import { presets } from "../schema.js"
import { PresetResponse } from "../../monkeytype.js"

export type Preset = typeof presets.$inferSelect

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

export async function getPresetsByUserId(state: State, userId: string): Promise<Array<Preset>> {
  return state.db.select().from(presets).where(eq(presets.userId, userId))
}

export async function deletePresets(state: State, userId: string) {
  await state.db.delete(presets).where(eq(presets.userId, userId))
}
