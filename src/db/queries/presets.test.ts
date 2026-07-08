import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { presets, users } from "../schema.js";
import { createPreset, editPresetById, getPresetById, getPresets, deletePresets, deletePresetsNotIn } from "./presets.js";

describe("Database Queries", () => {
  let db: ReturnType<typeof drizzle>;
  let state: Record<string, any>

  beforeAll(async () => {
    // 1. Initialize an in-memory PostgreSQL instance
    const client = new PGlite();
    db = drizzle(client);
    state = {db, config: {get: vi.fn().mockImplementation(() => "1")}}

    // 2. Push schema / run migrations instantly
    // Note: ensure your output folder path points to your migrations
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
  }, 20000);

  beforeEach(async () => {
    // 3. Clear data before each test to keep states isolated
    await db.delete(users);
    // 3. Clear data before each test to keep states isolated
    await db.delete(presets);
    // 4. Create default user
    await db.insert(users).values({ id: "1", email: "bob@example.com", displayName: "Bob" });
  });

  it("should insert and fetch a preset by id successfully", async () => {
    // Seed
    // @ts-ignore
    await createPreset(state, "1", "Normal", {_id: "1", name: "Normal", config: {}, settingGroups: {}}, "1")

    // Query
    // @ts-ignore
    const result = await getPresetById(state, "1");

    // Assert
    expect(result.name).toBe("Normal");
    expect(result.id).toBe("1");
  });

  it("should insert and fetch presets successfully", async () => {
    // Seed
    // @ts-ignore
    await createPreset(state, "1", "Normal", {_id: "1", name: "Normal", config: {}, settingGroups: {}}, "1")

    // Query
    // @ts-ignore
    const result = await getPresets(state);

    // Assert
    expect(result[0].name).toBe("Normal");
    expect(result[0]._id).toBe("1");
  });

  it("should insert and delete presets successfully", async () => {
    // Seed
    // @ts-ignore
    await createPreset(state, "1", "Normal", {_id: "1", name: "Normal", config: {}, settingGroups: {}}, "1")

    // Query
    // @ts-ignore
    await deletePresets(state, "1");

    // @ts-ignore
    const result = await getPresets(state)

    // Assert
    expect(result.length).toBe(0);
  });

  it("should delete presets not in the given id list, keeping the rest", async () => {
    // Seed
    // @ts-ignore
    await createPreset(state, "1", "Normal", {_id: "1", name: "Normal", config: {}, settingGroups: {}}, "1")
    // @ts-ignore
    await createPreset(state, "2", "Stale", {_id: "2", name: "Stale", config: {}, settingGroups: {}}, "1")

    // Query
    // @ts-ignore
    const deleted = await deletePresetsNotIn(state, ["1"])

    // @ts-ignore
    const result = await getPresets(state)

    // Assert
    expect(deleted.length).toBe(1);
    expect(deleted[0].id).toBe("2");
    expect(result.length).toBe(1);
    expect(result[0]._id).toBe("1");
  });

  it("should delete all presets for the user when given an empty id list", async () => {
    // Seed
    // @ts-ignore
    await createPreset(state, "1", "Normal", {_id: "1", name: "Normal", config: {}, settingGroups: {}}, "1")

    // Query
    // @ts-ignore
    await deletePresetsNotIn(state, [])

    // @ts-ignore
    const result = await getPresets(state)

    // Assert
    expect(result.length).toBe(0);
  });

  it("should insert and edit a preset successfully", async () => {
    // Seed
    // @ts-ignore
    await createPreset(state, "1", "Normal", {_id: "1", name: "Normal", config: {}, settingGroups: {}}, "1")

    // Query
    // @ts-ignore
    const result = await editPresetById(state, "1", {name: "Normal 2.0"})

    // Assert
    expect(result.name).toBe("Normal 2.0");
    expect(result.id).toBe("1");
  });
});
