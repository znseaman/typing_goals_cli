import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { goals, presets, users } from "../schema.js";
import { createGoal, getGoalsByUserId, getGoalByName, deleteGoalByName, editGoalById, GoalWithPresetAndTag } from "./goals.js";

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
    await db.delete(goals);
    await db.delete(users);
    await db.delete(presets);

    // 4. Create default user and preset
    await db.insert(users).values({ id: "1", email: "bob@example.com", displayName: "Bob" });
    await db.insert(presets).values({ id: "1", userId: "1", name: "Normal", fullDetails: {_id: "1", name: "Normal", config: { tags: ["1"] }, settingGroups: {}}});
    await db.insert(presets).values({ id: "2", userId: "1", name: "Abnormal", fullDetails: {_id: "2", name: "Abnormal", config: { tags: ["2"] }, settingGroups: {}}});
  });

  it("should insert and fetch goals successfully", async () => {
    // Seed
    // @ts-ignore
    await createGoal(state, "Normal", "count", 2, "1", "1", "daily")
    // @ts-ignore
    await createGoal(state, "Abnormal", "time", 30000, "2", "1", "daily")

    // Query
    // @ts-ignore
    const result = await getGoalsByUserId(state);

    // Assert
    expect(result[0].name).toBe("Abnormal");
    expect(result[0].type).toBe("time");
    expect(result[0].measure).toBe(30000);
    expect(result[0].timeframe).toBe("daily");
    expect(result[0].presetId).toBe("2");
    expect(result[0].presetName).toBe("Abnormal");
    expect(result[0].tagId).toBe("2");

    expect(result[1].name).toBe("Normal");
    expect(result[1].type).toBe("count");
    expect(result[1].measure).toBe(2);
    expect(result[1].timeframe).toBe("daily");
    expect(result[1].presetId).toBe("1");
    expect(result[1].presetName).toBe("Normal");
    expect(result[1].tagId).toBe("1");
  });

  it("should insert and get a goal by name successfully", async () => {
    // Seed
    // @ts-ignore
    const goal = await createGoal(state, "Normal", "count", 2, "1", "1", "daily")

    // Query
    // @ts-ignore
    const result = await getGoalByName(state, "Normal") as GoalWithPresetAndTag

    // Assert
    expect(result.id).toBe(goal.id);
    expect(result.name).toBe("Normal");
    expect(result.type).toBe("count");
    expect(result.measure).toBe(2);
    expect(result.presetId).toBe("1");
    expect(result.presetName).toBe("Normal");
    expect(result.tagId).toBe("1");
    expect(result.timeframe).toBe("daily");
  });

  it("should insert and return an empty array when goal name is not found", async () => {
    // Seed
    // @ts-ignore
    await createGoal(state, "Normal", "count", 2, "1", "1", "daily")

    // Query
    // @ts-ignore
    const result = await getGoalByName(state, "Abnormal") as boolean

    // Assert
    expect(result).toBe(false);
  });

  it("should insert and delete goal by name successfully", async () => {
    // Seed
    // @ts-ignore
    await createGoal(state, "Normal", "count", 2, "1", "1", "daily")

    // Query
    // @ts-ignore
    const result = await deleteGoalByName(state, "Normal", "1");

    // Assert
    expect(result.name).toBe("Normal");
  });

  it("should insert and edit goal by id successfully", async () => {
    // Seed
    // @ts-ignore
    const goal = await createGoal(state, "Normal", "count", 2, "1", "1", "daily")

    // Query
    // @ts-ignore
    const result = await editGoalById(state, goal.id, "1", {name: "Normal 2.0"})

    // Assert
    expect(result.name).toBe("Normal 2.0");
  });
});
