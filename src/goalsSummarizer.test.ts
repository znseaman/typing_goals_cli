import { beforeEach, describe, expect, it, vi } from "vitest";
import { State } from "./state.test.js";
import { runDailySummary, runBackfill } from "./goalsSummarizer.js";

const countGoal = {
  id: "g1", tagId: "tag1", presetId: "p1", presetName: "Preset 1",
  name: "Normal", type: "count" as const, measure: 2, timeframe: "daily",
};

const timeGoal = {
  id: "g1", tagId: "tag1", presetId: "p1", presetName: "Preset 1",
  name: "Normal", type: "time" as const, measure: 30000, timeframe: "daily",
};

const makeResult = (id: string, tagId: string, wpm: number, testDuration: number, extra?: object) => ({
  _id: id, tags: [tagId], wpm, testDuration, timestamp: 1782000000000,
  ...extra,
});

describe("runDailySummary", () => {
  let state: InstanceType<typeof State>;

  beforeEach(() => {
    state = new State();
    vi.spyOn(state.config, "get").mockReturnValue("user1");
  });

  it("returns early when userId is 'undefined'", async () => {
    vi.spyOn(state.config, "get").mockReturnValue("undefined");
    const getGoalsSpy = vi.spyOn(state.query, "getGoalsByUserId");

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(getGoalsSpy).not.toHaveBeenCalled();
  });

  it("returns early when no goals exist", async () => {
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([]);
    const getResultsSpy = vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps");

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(getResultsSpy).not.toHaveBeenCalled();
  });

  it("skips creating entry when one already exists for that date", async () => {
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue([]);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue({ id: "existing" } as any);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry");

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("creates met=true entry for count goal when target is reached", async () => {
    const r1 = makeResult("r1", "tag1", 80, 30);
    const r2 = makeResult("r2", "tag1", 100, 25);
    const r3 = makeResult("r3", "tag2", 90, 20); // different tag, should not count

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue([r1, r2, r3] as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({
      goalId: "g1",
      userId: "user1",
      date: "2026-06-28",
      met: true,
      totalMeasure: 2,
      resultIds: ["r1", "r2"],
      minWpm: 80,
      avgWpm: 90,
      maxWpm: 100,
    }));
  });

  it("creates met=false entry for count goal when target is not reached", async () => {
    const r1 = makeResult("r1", "tag1", 75, 30);

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue([r1] as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({
      met: false,
      totalMeasure: 1,
    }));
  });

  it("creates entry with null WPM stats when no results match the goal tag", async () => {
    const r1 = makeResult("r1", "other-tag", 80, 30);

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue([r1] as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({
      totalMeasure: 0,
      resultIds: [],
      minWpm: null,
      avgWpm: null,
      maxWpm: null,
    }));
  });

  it("creates met=true entry for time goal using testDuration and incompleteTestSeconds", async () => {
    // 20s * 1000 + 15s * 1000 = 35000ms >= 30000ms measure
    const r1 = makeResult("r1", "tag1", 80, 20, { incompleteTestSeconds: 15 });

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([timeGoal]);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue([r1] as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({
      met: true,
      totalMeasure: 35000,
    }));
  });

  it("creates met=false entry for time goal when total time is below target", async () => {
    // 10s * 1000 = 10000ms < 30000ms
    const r1 = makeResult("r1", "tag1", 80, 10);

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([timeGoal]);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue([r1] as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({
      met: false,
      totalMeasure: 10000,
    }));
  });

  it("creates entries for multiple goals in one call", async () => {
    const goal2 = { ...countGoal, id: "g2", tagId: "tag2", name: "Hard" };
    const r1 = makeResult("r1", "tag1", 80, 30);
    const r2 = makeResult("r2", "tag2", 90, 30);

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal, goal2]);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue([r1, r2] as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runDailySummary(state, "2026-06-28");

    // One entry per goal (2 goals, each matched by 1 result, neither meets measure=2)
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({ goalId: "g1", met: false }));
    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({ goalId: "g2", met: false }));
  });
});

describe("runBackfill", () => {
  let state: InstanceType<typeof State>;

  const now = Date.now();
  const yesterdayStr = new Date(now - 86400000).toISOString().split("T")[0];
  const twoDaysAgoStr = new Date(now - 2 * 86400000).toISOString().split("T")[0];
  const threeDaysAgoStr = new Date(now - 3 * 86400000).toISOString().split("T")[0];
  const threeDaysAgoStart = new Date(threeDaysAgoStr + "T00:00:00Z").getTime();

  const makeBackfillResult = (dateStr: string) =>
    makeResult(`r-${dateStr}`, "tag1", 85, 30, {
      timestamp: new Date(dateStr + "T12:00:00Z").getTime(),
    });

  beforeEach(() => {
    state = new State();
    vi.spyOn(state.config, "get").mockReturnValue("user1");
  });

  it("returns early when userId is 'undefined'", async () => {
    vi.spyOn(state.config, "get").mockReturnValue("undefined");
    const getGoalsSpy = vi.spyOn(state.query, "getGoalsByUserId");

    // @ts-ignore
    await runBackfill(state);

    expect(getGoalsSpy).not.toHaveBeenCalled();
  });

  it("returns early when no goals exist", async () => {
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([]);
    const getLatestSpy = vi.spyOn(state.query, "getLatestGoalsHistoryDateForUser");

    // @ts-ignore
    await runBackfill(state);

    expect(getLatestSpy).not.toHaveBeenCalled();
  });

  it("returns early when latestDate is already up to date", async () => {
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getLatestGoalsHistoryDateForUser").mockResolvedValue(yesterdayStr);
    const getEarliestSpy = vi.spyOn(state.query, "getEarliestResultTimestampForUser");

    // @ts-ignore
    await runBackfill(state);

    expect(getEarliestSpy).not.toHaveBeenCalled();
  });

  it("returns early when no results exist (no earliest timestamp)", async () => {
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getLatestGoalsHistoryDateForUser").mockResolvedValue(undefined);
    vi.spyOn(state.query, "getEarliestResultTimestampForUser").mockResolvedValue(undefined);
    const getResultsSpy = vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps");

    // @ts-ignore
    await runBackfill(state);

    expect(getResultsSpy).not.toHaveBeenCalled();
  });

  it("backfills days from earliest result through yesterday when no history exists", async () => {
    const results = [
      makeBackfillResult(threeDaysAgoStr),
      makeBackfillResult(twoDaysAgoStr),
      makeBackfillResult(yesterdayStr),
    ];

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getLatestGoalsHistoryDateForUser").mockResolvedValue(undefined);
    vi.spyOn(state.query, "getEarliestResultTimestampForUser").mockResolvedValue(threeDaysAgoStart);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue(results as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runBackfill(state);

    // 3 days × 1 goal = 3 entries
    expect(createSpy).toHaveBeenCalledTimes(3);
    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({ date: threeDaysAgoStr }));
    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({ date: twoDaysAgoStr }));
    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({ date: yesterdayStr }));
  });

  it("starts from latestDate + 1 day when history already exists", async () => {
    const results = [makeBackfillResult(yesterdayStr)];
    const twoDaysAgoStart = new Date(twoDaysAgoStr + "T00:00:00Z").getTime();

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getLatestGoalsHistoryDateForUser").mockResolvedValue(twoDaysAgoStr);
    vi.spyOn(state.query, "getEarliestResultTimestampForUser").mockResolvedValue(twoDaysAgoStart);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue(results as any);
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runBackfill(state);

    // Only yesterday should be filled (latestDate = twoDaysAgoStr, next day = yesterday)
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({ date: yesterdayStr }));
  });

  it("skips days that already have an existing entry", async () => {
    const results = [
      makeBackfillResult(twoDaysAgoStr),
      makeBackfillResult(yesterdayStr),
    ];
    const twoDaysAgoStart = new Date(twoDaysAgoStr + "T00:00:00Z").getTime();

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([countGoal]);
    vi.spyOn(state.query, "getLatestGoalsHistoryDateForUser").mockResolvedValue(undefined);
    vi.spyOn(state.query, "getEarliestResultTimestampForUser").mockResolvedValue(twoDaysAgoStart);
    vi.spyOn(state.query, "getResultsByUserIdBetweenTimestamps").mockResolvedValue(results as any);
    // Return existing entry for twoDaysAgo, undefined for yesterday
    vi.spyOn(state.query, "getGoalsHistoryByGoalIdAndDate")
      .mockResolvedValueOnce({ id: "existing" } as any)
      .mockResolvedValueOnce(undefined);
    const createSpy = vi.spyOn(state.query, "createGoalsHistoryEntry").mockResolvedValue({} as any);

    // @ts-ignore
    await runBackfill(state);

    // twoDaysAgo skipped (existing), only yesterday created
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(state, expect.objectContaining({ date: yesterdayStr }));
  });
});
