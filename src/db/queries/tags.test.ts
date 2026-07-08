import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { tags, users } from "../schema.js";
import { createTag, editTagById, getTagById, getTagByName, getTags, deleteTags, deleteTagsNotIn } from "./tags.js";

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
    await db.delete(tags);
    // 4. Create default user
    await db.insert(users).values({ id: "1", email: "bob@example.com", displayName: "Bob" });
  });

  it("should insert and fetch a tag by id successfully", async () => {
    // Seed
    // @ts-ignore
    await createTag(state, "1", "Normal", {_id: "1", name: "Normal", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})

    // Query
    // @ts-ignore
    const result = await getTagById(state, "1");

    // Assert
    expect(result.name).toBe("Normal");
    expect(result.id).toBe("1");
  });

  it("should insert and fetch a tag by name successfully", async () => {
    // Seed
    // @ts-ignore
    await createTag(state, "1", "Normal", {_id: "1", name: "Normal", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})

    // Query
    // @ts-ignore
    const result = await getTagByName(state, "Normal");

    // Assert
    expect(result.name).toBe("Normal");
    expect(result.id).toBe("1");
  });

  it("should insert and fetch tags successfully", async () => {
    // Seed
    // @ts-ignore
    await createTag(state, "1", "Normal", {_id: "1", name: "Normal", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})

    // Query
    // @ts-ignore
    const result = await getTags(state);

    // Assert
    expect(result[0].name).toBe("Normal");
    expect(result[0]._id).toBe("1");
  });

  it("should insert and delete tags successfully", async () => {
    // Seed
    // @ts-ignore
    await createTag(state, "1", "Normal", {_id: "1", name: "Normal", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})

    // Query
    // @ts-ignore
    await deleteTags(state);

    // @ts-ignore
    const result = await getTags(state)

    // Assert
    expect(result.length).toBe(0);
  });

  it("should delete tags not in the given id list, keeping the rest", async () => {
    // Seed
    // @ts-ignore
    await createTag(state, "1", "Normal", {_id: "1", name: "Normal", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})
    // @ts-ignore
    await createTag(state, "2", "Stale", {_id: "2", name: "Stale", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})

    // Query
    // @ts-ignore
    const deleted = await deleteTagsNotIn(state, ["1"])

    // @ts-ignore
    const result = await getTags(state)

    // Assert
    expect(deleted.length).toBe(1);
    expect(deleted[0].id).toBe("2");
    expect(result.length).toBe(1);
    expect(result[0]._id).toBe("1");
  });

  it("should delete all tags for the user when given an empty id list", async () => {
    // Seed
    // @ts-ignore
    await createTag(state, "1", "Normal", {_id: "1", name: "Normal", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})

    // Query
    // @ts-ignore
    await deleteTagsNotIn(state, [])

    // @ts-ignore
    const result = await getTags(state)

    // Assert
    expect(result.length).toBe(0);
  });

  it("should insert and edit a tag successfully", async () => {
    // Seed
    // @ts-ignore
    await createTag(state, "1", "Normal", {_id: "1", name: "Normal", personalBests: {words: {"25": []}, time: {}, custom: {}, quote: {}, zen:{}}})

    // Query
    // @ts-ignore
    const result = await editTagById(state, "1", {name: "Normal 2.0"})

    // Assert
    expect(result.name).toBe("Normal 2.0");
    expect(result.id).toBe("1");
  });
});
