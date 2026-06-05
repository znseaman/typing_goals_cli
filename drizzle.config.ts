import { defineConfig } from "drizzle-kit"

import { config } from "./src/config.js"

export default defineConfig({
  dbCredentials: {
    url: String(config.get("dbURL")),
  },
  dialect: "postgresql",
  out: "src/db/migrations",
  schema: "src/db/schema.ts",
})
