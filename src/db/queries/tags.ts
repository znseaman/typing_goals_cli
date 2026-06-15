import type { State } from "../../state.js"
import { and, eq, sql } from "drizzle-orm"

import { tags } from '../schema.js'
import { TagResponse } from "../../monkeytype.js"

export type Tag = typeof tags.$inferSelect

export type TagObject = {
  _id: string,
  name: string,
  personalBests: string,
}

export async function createTag(state: State, id: string, name: string, fullDetails: TagResponse, userId: string) {
  const [result] = await state.db.insert(tags).values({fullDetails, id, name, userId}).returning()
  return result
}

export async function getTagById(state: State, id: string) {
  const [result] = await state.db.select().from(tags).where(eq(tags.id, id))
  return result
}

export async function getTagByName(state: State, userId: string, name: string) {
  const [result] = await state.db.select().from(tags).where(
    and(
      eq(tags.userId, userId),
      eq(tags.name, name)
    )
  )
  return result
}

export async function getTags(state: State): Promise<Array<TagObject>> {
  const userId = String(state.config.get("localId"))
  
  return state.db.select({
    _id: tags.id,
    name: tags.name,
    personalBests: sql<string>`${tags.fullDetails}->>'personalBests'`,
  }).from(tags).where(eq(tags.userId, userId))
}

export async function deleteTags(state: State, userId: string) {
  await state.db.delete(tags).where(eq(tags.userId, userId))
}

export async function editTagById(state: State, id: string, toSet: {name?: string, fullDetails?: TagResponse}) {
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.update(tags).set(toSet).where(and(eq(tags.id, id), eq(tags.userId, userId))).returning()
  return result
}
