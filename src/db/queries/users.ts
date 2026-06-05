import type { State } from "../../state.js"
import { eq } from "drizzle-orm"

import { users } from "../schema.js"

export type User = typeof users.$inferSelect

export async function createUser(state: State, id: string, email: string, displayName: string) {
  // @ts-ignore
  const [result] = await state.db.insert(users).values({id, email, displayName}).returning()
  return result
}

export async function getUserById(state: State, id: string) {
  const result = await state.db.select().from(users).where(eq(users.id, id))
  return result.length === 0 ? false : result[0]
}

export async function deleteUsers(state: State) {
  await state.db.delete(users)
}

export async function getUsers(state: State) {
  return state.db.select().from(users)
}
