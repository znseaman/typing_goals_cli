import type { State } from "../../state.js"
import { eq } from "drizzle-orm"

import { presets } from "../schema.js"

export type Preset = typeof presets.$inferSelect

export async function createPreset(state: State, id: string, name: string, fullDetails: string, userId: string) {
  const [result] = await state.db.insert(presets).values({fullDetails, id, name, userId}).returning()
  return result
}

export async function getPresetById(state: State, id: string) {
  const [result] = await state.db.select().from(presets).where(eq(presets.id, id))
  return result
}

export async function getPresetsByUserId(state: State, userId: string): Promise<Array<Preset>> {
  return state.db.select().from(presets).where(eq(presets.userId, userId))
}
