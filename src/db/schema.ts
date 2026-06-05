import {integer, json, pgTable, text, timestamp, uuid} from "drizzle-orm/pg-core"

export const users = pgTable('users', {
  id: text('id').primaryKey().notNull(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const presets = pgTable('presets', {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  fullDetails: json('full_details'),
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: text('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
})
