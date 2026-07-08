import type { State } from "../../state.js"
import { and, eq, notInArray, sql } from "drizzle-orm"

import { tags } from '../schema.js'
import { TagResponse } from "../../monkeytype.js"
import { testConnection } from "../index.js"

export type Tag = typeof tags.$inferSelect

export type TagObject = {
  _id: string,
  name: string,
  personalBests: string,
}

export type TagsQueries = {
  createTag: (state: State, id: string, name: string, fullDetails: TagResponse) => Promise<Tag>,
  deleteTags: (state: State) => Promise<void>,
  deleteTagsNotIn: (state: State, ids: string[]) => Promise<Tag[]>,
  editTagById: (state: State, id: string, toSet: {name?: string, fullDetails?: TagResponse}) => Promise<Tag>,
  getTagById: (state: State, id: string) => Promise<Tag>,
  getTags: (state: State) => Promise<Array<TagObject>>,
}

export async function createTag(state: State, id: string, name: string, fullDetails: TagResponse) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.insert(tags).values({fullDetails, id, name, userId}).returning()
  return result
}

export async function getTagById(state: State, id: string) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const [result] = await state.db.select().from(tags).where(eq(tags.id, id))
  return result
}

export async function getTagByName(state: State, name: string) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.select().from(tags).where(
    and(
      eq(tags.userId, userId),
      eq(tags.name, name)
    )
  )
  return result
}

export async function getTags(state: State): Promise<Array<TagObject>> {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  
  return state.db.select({
    _id: tags.id,
    name: tags.name,
    personalBests: sql<string>`${tags.fullDetails}->>'personalBests'`,
  }).from(tags).where(eq(tags.userId, userId))
}

export async function deleteTags(state: State) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  await state.db.delete(tags).where(eq(tags.userId, userId))
}

export async function deleteTagsNotIn(state: State, ids: string[]) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  return state.db.delete(tags).where(and(eq(tags.userId, userId), notInArray(tags.id, ids))).returning()
}

export async function editTagById(state: State, id: string, toSet: {name?: string, fullDetails?: TagResponse}) {
  if (!state.config.get("dbURL")) await testConnection(state.db)
  const userId = String(state.config.get("localId"))
  const [result] = await state.db.update(tags).set(toSet).where(and(eq(tags.id, id), eq(tags.userId, userId))).returning()
  return result
}

export default {
  createTag,
  deleteTags,
  deleteTagsNotIn,
  editTagById,
  getTagById,
  getTags,
} as TagsQueries
