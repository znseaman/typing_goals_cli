import { describe, test, vi, expect } from "vitest";
import { commandGoals, printGoalsTable, validateMeasure } from "./goals.js";
import { GoalWithPresetAndTag } from "../db/queries/goals.js";
import { State } from "../state.test.js";
import { logger } from "../ui/logger.js";

// globally mock the "read" module
vi.mock("read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("read")>()
  return {
    ...actual,
    read: vi.fn(), 
  }
})

describe("printGoalsTable", () => {
  test("should print goals table (non-verbose)", async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

    const goals: GoalWithPresetAndTag[] = [{presetId: "presetId1", name: "Normal", id: "lol", type: "count", measure: 2, presetName: "Preset 1", tagId: "tagId1", timeframe: "daily"}]
    const goalsObj = { tagId1: { name: "tag 1"}}
    const verbose = false
    
    // @ts-ignore
    await printGoalsTable(goals, goalsObj, verbose);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(tableSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    tableSpy.mockRestore();
  });

  test("should print goals table (verbose)", async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

    const goals: GoalWithPresetAndTag[] = [
      {presetId: "presetId1", name: "Normal", id: "lol", type: "count", measure: 2, presetName: "Preset 1", tagId: "tagId1", timeframe: "daily"}
    ]
    const goalsObj = { 
      tagId1: { 
        name: "tag 1",
        measure: 2,
        count: 2,
        presetConfig: { mode: "words", words: 25, difficulty: "master", language: "english", oppositeShiftMode: true, minWpmCustomSpeed: 70, minAccCustom: 100, minBurstCustomSpeed: 100 }
      }
    }
    const verbose = true
    
    // @ts-ignore
    await printGoalsTable(goals, goalsObj, verbose);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(tableSpy).toHaveBeenCalledTimes(1);
    expect(tableSpy).toHaveBeenCalledWith([
      {
        "name": "Normal",
        "pb date": "N/A",
        "associated preset": "tag 1",
        "status": "✅",
        "target": 2,
        "to go": 0,
        "total tests": 2,
        "total time": "0 minutes",
        "type": "count",
        "❌ failed": 0,
        "🏆 pb": "N/A",
      },
    ], [
      "status",
      "name",
      "type",
      "target",
      "to go",
      "total time",
      "total tests",
      "❌ failed",
      "🏆 pb",
      "pb date",
      "associated preset",
    ])

    logSpy.mockRestore();
    tableSpy.mockRestore();
  });
});

describe("validateMeasure", () => {
  test.each([
    { measure: "f", type: "count", expected: "Invalid number" },
    { measure: "infinity", type: "count", expected: "Invalid number" },
    { measure: "0", type: "count", expected: "Invalid number" },
    { measure: "f", type: "time", expected: "Invalid time" },
    { measure: "0 decameters", type: "time", expected: "Invalid time duration" },
    { measure: "0s", type: "time", expected: "Invalid number" },
  ])
  ('throws validateMeasure($measure, $type) -> $expected', ({measure, type, expected}) => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => validateMeasure(measure, type)).toThrow(
      new Error(expected),
    )

    // expect(logSpy).toHaveBeenCalledTimes(1);
    // logSpy.mockRestore();
  });

  test.each([
    { measure: "10", type: "count", expected: "10" },
    { measure: "2", type: "count", expected: "2" },
    { measure: "100ms", type: "time", expected: "100" },
    { measure: "2 seconds", type: "time", expected: "2000" },
    { measure: "30 minutes", type: "time", expected: "1800000" },
    { measure: "1 hour", type: "time", expected: "3600000" },
  ])
  ('validateMeasure($measure, $type) -> $expected', ({measure, type, expected}) => {
    expect(validateMeasure(measure, type)).toBe(expected)
  });
});

describe("commandGoals", () => {
  test.each([
    { args: [], logOutput: `No goals created yet. Type \"goals create\" to create a goal.`},
  ])
  ('commandGoals(state, $args)', async ({args, logOutput}) => {
    const state = new State()
    const logSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const getGoalsByUserIdSpy = vi.spyOn(state.goalsQueries, "getGoalsByUserId").mockResolvedValue([])
    // @ts-ignore
    await commandGoals(state, args)

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(logOutput)
    expect(getGoalsByUserIdSpy).toHaveBeenCalledTimes(1)
    logSpy.mockRestore()
    getGoalsByUserIdSpy.mockRestore()
  });

  test.each([
    { args: [], logOutput: ``, expected: {data: [], message: "Results"}},
  ])
  ('commandGoals(state, $args)', async ({args, logOutput, expected}) => {
    // Here we tell Vitest to mock fetch on the `window` object.
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(expected),
      }),
    );

    const state = new State()
    const getGoalsByUserIdSpy = vi.spyOn(state.goalsQueries, "getGoalsByUserId").mockResolvedValue([1])

    // @ts-ignore
    await commandGoals(state, args)

    expect(getGoalsByUserIdSpy).toHaveBeenCalledTimes(1)
    getGoalsByUserIdSpy.mockRestore()
  });
});