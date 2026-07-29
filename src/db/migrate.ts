import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"

const dbURL = process.env.DATABASE_URL
if (!dbURL) throw new Error("DATABASE_URL environment variable is required")

const db = drizzle(dbURL)
await migrate(db, { migrationsFolder: "./src/db/migrations" })
