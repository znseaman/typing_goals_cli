import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { results, users } from "../schema.js";
import { createResult, getResultById, getResultsByUserIdAndAfterTimestamp, getResultsByUserIdBetweenTimestamps, getEarliestResultTimestampForUser } from "./results.js";

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
    await db.delete(results);
    // 4. Create default user
    await db.insert(users).values({ id: "1", email: "bob@example.com", displayName: "Bob" });
  });

  it("should insert and fetch results successfully", async () => {
    // Seed
    // @ts-ignore
    await createResult(state, "1", {_id: "1", mode: "words", timestamp: 1781990752581})
    // @ts-ignore
    await createResult(state, "2", {_id: "2", mode: "words", timestamp: 1781990837928})

    // Query
    // @ts-ignore
    const result = await getResultsByUserIdAndAfterTimestamp(state, 1781990752581);

    // Assert
    expect(result[0]._id).toBe("1");
    expect(result[0].mode).toBe("words");
    expect(result[0].timestamp).toBe(1781990752581);

    expect(result[1]._id).toBe("2");
    expect(result[1].mode).toBe("words");
    expect(result[1].timestamp).toBe(1781990837928);
  });

  it("should insert and get a result successfully", async () => {
    // Seed
    // @ts-ignore
    await createResult(state, "1", {_id: "1", mode: "words", timestamp: 1781990752581})

    // Query
    // @ts-ignore
    const result = await getResultById(state, "1")

    // Assert
    expect(result.id).toBe("1");
    expect(result.userId).toBe("1");
    expect(result.fullDetails).toStrictEqual({_id: "1", mode: "words", timestamp: 1781990752581});
  });

  it("should insert and return an empty array when result id is not found", async () => {
    // Seed
    // @ts-ignore
    await createResult(state, "1", {_id: "1", mode: "words", timestamp: 1781990752581})
    // @ts-ignore
    await createResult(state, "2", {_id: "2", mode: "words", timestamp: 1781990837928})

    // Query
    // @ts-ignore
    const result = await getResultsByUserIdAndAfterTimestamp(state, 1781990837928 + 1);

    // Assert
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  const ts1 = 1782000000000;
  const ts2 = ts1 + 3600000;
  const ts3 = ts1 + 7200000;

  it("should return results within timestamp range (inclusive start, exclusive end)", async () => {
    // @ts-ignore
    await createResult(state, "a", {_id: "a", timestamp: ts1})
    // @ts-ignore
    await createResult(state, "b", {_id: "b", timestamp: ts2})
    // @ts-ignore
    await createResult(state, "c", {_id: "c", timestamp: ts3})

    // @ts-ignore
    const result = await getResultsByUserIdBetweenTimestamps(state, ts1, ts3)

    expect(result.length).toBe(2);
    expect(result[0]._id).toBe("a");
    expect(result[1]._id).toBe("b");
  });

  it("should return empty array when no results fall within range", async () => {
    // @ts-ignore
    await createResult(state, "a", {_id: "a", timestamp: ts1})

    // @ts-ignore
    const result = await getResultsByUserIdBetweenTimestamps(state, ts2, ts3)

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should return the earliest result timestamp for the user", async () => {
    // Insert out of order
    // @ts-ignore
    await createResult(state, "c", {_id: "c", timestamp: ts3})
    // @ts-ignore
    await createResult(state, "a", {_id: "a", timestamp: ts1})
    // @ts-ignore
    await createResult(state, "b", {_id: "b", timestamp: ts2})

    // @ts-ignore
    const earliest = await getEarliestResultTimestampForUser(state)

    expect(earliest).toBe(ts1);
  });

  it("should return undefined when no results exist", async () => {
    // @ts-ignore
    const earliest = await getEarliestResultTimestampForUser(state)

    expect(earliest).toBeUndefined();
  });
});
