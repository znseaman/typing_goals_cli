import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { users } from "../schema.js";
import { createUser, getUserById, deleteUsers, getUsers } from "./users.js";

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
  });

  it("should insert and fetch users successfully", async () => {
    // Seed
    // @ts-ignore
    await createUser(state, "1", "bob@example.com", "Bob")
    // @ts-ignore
    await createUser(state, "2", "alice@example.com", "Alice")

    // Query
    // @ts-ignore
    const result = await getUsers(state);

    // Assert
    expect(result[0].id).toBe("1");
    expect(result[0].email).toBe("bob@example.com");
    expect(result[0].displayName).toBe("Bob");

    expect(result[1].id).toBe("2");
    expect(result[1].email).toBe("alice@example.com");
    expect(result[1].displayName).toBe("Alice");
  });

  it("should insert and get a user successfully", async () => {
    // Seed
    // @ts-ignore
    await createUser(state, "1", "bob@example.com", "Bob")

    // Query
    // @ts-ignore
    const result = await getUserById(state, "1") as User

    // Assert
    expect(result.id).toBe("1");
    expect(result.email).toBe("bob@example.com");
    expect(result.displayName).toBe("Bob");
  });

  it("should insert and return an empty array when result id is not found", async () => {
    // Seed
    // @ts-ignore
    await createUser(state, "1", "bob@example.com", "Bob")

    // Query
    // @ts-ignore
    const result = await getUserById(state, "99999") as boolean

    // Assert
    expect(result).toBe(false);
  });

  it("should insert and delete users successfully", async () => {
    // Seed
    // @ts-ignore
    await createUser(state, "1", "bob@example.com", "Bob")

    // Query
    // @ts-ignore
    await deleteUsers(state);

    // @ts-ignore
    const result = await getUsers(state)

    // Assert
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
