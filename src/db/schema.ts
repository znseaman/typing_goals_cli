import {integer, json, pgEnum, pgTable, text, timestamp, uuid} from "drizzle-orm/pg-core"

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

export const tags = pgTable('tags', {
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

export const results = pgTable('results', {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  fullDetails: json('full_details'),
  id: text('id').primaryKey().notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: text('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
})

export const goalTypeEnum = pgEnum("type", ["time", "count"])

export const goals = pgTable('goals', {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  name: text('name').notNull(),
  type: goalTypeEnum('type').notNull(),
  measure: integer('measure').notNull(),
  presetId: text('preset_id')
    .references(() => presets.id, {onDelete: 'cascade'})
    .notNull(),
  timeframe: text('timeframe').notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: text('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull()
})

export const goalsHistory = pgTable('goals_history', {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  name: text('name').notNull(),
  type: goalTypeEnum('type').notNull(),
  measure: integer('measure').notNull(),
  timeframe: text('timeframe').notNull(),
  totalMeasure: integer('measure').notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  goalId: text('goal_id')
    .references(() => goals.id, {onDelete: 'cascade'})
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull()
})
