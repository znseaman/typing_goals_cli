import type { State } from "../../state.js"
import { eq } from "drizzle-orm"

import { tags } from '../schema.js'
import { TagResponse } from "../../monkeytype.js"

export type Tag = typeof tags.$inferSelect

export async function createTag(state: State, id: string, name: string, fullDetails: TagResponse, userId: string) {
  const [result] = await state.db.insert(tags).values({fullDetails, id, name, userId}).returning()
  return result
}

export async function getTagById(state: State, id: string) {
  const [result] = await state.db.select().from(tags).where(eq(tags.id, id))
  return result
}

export async function getTagsByUserId(state: State, userId: string) {
  return state.db.select().from(tags).where(eq(tags.userId, userId))
}

export async function deleteTags(state: State, userId: string) {
  await state.db.delete(tags).where(eq(tags.userId, userId))
}
