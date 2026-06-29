import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { goals, goalsHistory, presets, users } from "../schema.js";
import {
  createGoalsHistoryEntry,
  getGoalsHistoryByGoalId,
  getGoalsHistoryByGoalIdAndDate,
  getLatestGoalsHistoryDateForUser,
  computeStreak,
} from "./goalsHistory.js";

describe("Database Queries", () => {
  let db: ReturnType<typeof drizzle>;
  let state: Record<string, any>;
  let goalId: string;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client);
    state = { db, config: { get: vi.fn().mockImplementation(() => "1") } };
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
  }, 20000);

  beforeEach(async () => {
    await db.delete(goalsHistory);
    await db.delete(goals);
    await db.delete(presets);
    await db.delete(users);

    await db.insert(users).values({ id: "1", email: "bob@example.com", displayName: "Bob" });
    await db.insert(presets).values({ id: "1", userId: "1", name: "Normal", fullDetails: { _id: "1", name: "Normal", config: { tags: ["1"] }, settingGroups: {} } });

    const [goal] = await db.insert(goals).values({ userId: "1", name: "Normal", type: "count", measure: 2, presetId: "1", timeframe: "daily" }).returning();
    goalId = goal.id;
  });

  const baseEntry = () => ({
    goalId,
    userId: "1",
    date: "2026-06-25",
    met: true,
    name: "Normal",
    type: "count" as const,
    measure: 2,
    timeframe: "daily",
    totalMeasure: 3,
    failedTests: 1,
    resultIds: ["r1", "r2"],
    minWpm: 80,
    maxWpm: 100,
    avgWpm: 90,
  });

  it("should insert and fetch goal history entries by goalId", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, baseEntry());
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26" });

    // @ts-ignore
    const result = await getGoalsHistoryByGoalId(state, goalId);

    expect(result.length).toBe(2);
    expect(result[0].date).toBe("2026-06-25");
    expect(result[0].met).toBe(true);
    expect(result[0].totalMeasure).toBe(3);
    expect(result[1].date).toBe("2026-06-26");
  });

  it("should return entries in ascending date order", async () => {
    // Insert out of order
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-27" });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-25" });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26" });

    // @ts-ignore
    const result = await getGoalsHistoryByGoalId(state, goalId);

    expect(result[0].date).toBe("2026-06-25");
    expect(result[1].date).toBe("2026-06-26");
    expect(result[2].date).toBe("2026-06-27");
  });

  it("should return empty array when goal has no history", async () => {
    // @ts-ignore
    const result = await getGoalsHistoryByGoalId(state, goalId);
    expect(result).toStrictEqual([]);
  });

  it("should fetch goal history entry by goalId and date", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, baseEntry());
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26", met: false });

    // @ts-ignore
    const result = await getGoalsHistoryByGoalIdAndDate(state, goalId, "2026-06-26");

    expect(result).toBeDefined();
    expect(result!.date).toBe("2026-06-26");
    expect(result!.met).toBe(false);
  });

  it("should return undefined when no entry matches the given date", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, baseEntry());

    // @ts-ignore
    const result = await getGoalsHistoryByGoalIdAndDate(state, goalId, "2026-06-29");

    expect(result).toBeUndefined();
  });

  it("should return the latest history date for the user", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-25" });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-27" });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26" });

    // @ts-ignore
    const latest = await getLatestGoalsHistoryDateForUser(state);

    expect(latest).toBe("2026-06-27");
  });

  it("should return undefined when no history exists", async () => {
    // @ts-ignore
    const latest = await getLatestGoalsHistoryDateForUser(state);
    expect(latest).toBeUndefined();
  });

  it("computeStreak: returns 0 when no history exists", async () => {
    // @ts-ignore
    const streak = await computeStreak(state, goalId);
    expect(streak).toBe(0);
  });

  it("computeStreak: returns 1 for a single met entry", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-25", met: true });

    // @ts-ignore
    const streak = await computeStreak(state, goalId);
    expect(streak).toBe(1);
  });

  it("computeStreak: returns count of consecutive met entries from newest", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-25", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-27", met: true });

    // @ts-ignore
    const streak = await computeStreak(state, goalId);
    expect(streak).toBe(3);
  });

  it("computeStreak: returns 0 when the most recent entry is not met", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-25", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-27", met: false });

    // @ts-ignore
    const streak = await computeStreak(state, goalId);
    expect(streak).toBe(0);
  });

  it("computeStreak: stops at a gap in consecutive dates", async () => {
    // Gap: 2026-06-24 is missing
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-23", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-25", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26", met: true });

    // @ts-ignore
    const streak = await computeStreak(state, goalId);
    expect(streak).toBe(2);
  });

  it("computeStreak: stops at first not-met entry even with more met entries before it", async () => {
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-23", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-24", met: false });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-25", met: true });
    // @ts-ignore
    await createGoalsHistoryEntry(state, { ...baseEntry(), date: "2026-06-26", met: true });

    // @ts-ignore
    const streak = await computeStreak(state, goalId);
    expect(streak).toBe(2);
  });
});
