import { describe, test, vi, expect } from "vitest";
import { commandGoals, createCompleter, createGoalsObject, GoalsObject, printGoalsTable, validateMeasure, validateType } from "./goals.js";
import { GoalWithPresetAndTag } from "../db/queries/goals.js";
import { State } from "../state.test.js";
import { logger } from "../ui/logger.js";
import { TagObject } from "../db/queries/tags.js";
import { PresetObject } from "../db/queries/presets.js";
import { read } from "read";

const goals1 = [{tagId: "tagId1", presetId: "presetId1", measure: 2, name: "Goal 1", type: "count", timeframe: "daily", presetName: "Preset 1"}]
const tags1 = [{_id: "tagId1", personalBests: `{ "words": { "25": [{ "wpm": 50, "timestamp": 1781636303784 }] } }`}]
const presets1 = [{_id: "presetId1", config: `{"mode": "words", "words": 25}`, name: "Preset 1", tagId: "tagId1"}]
const allResults1 = [{tags: ["tagId1"], restartCount: 1, testDuration: 15, incompleteTestSeconds: 15}]
const goalsObject1 = {tagId1: {count: 1, goal: 2, goalName: "Goal 1", goalType: "count", goalTimeFrame: "daily", goalTotalTime: 2, goalTotalTests: 2, name: "Preset 1", pb: 50, pbTimestamp: 1781636303784, failedAttempts: 1, totalSeconds: 30, presetConfig: {mode: "words", words: 25}}}

const goals2 = [{tagId: "tagId2", presetId: "presetId2", measure: 2, name: "Goal 2", type: "count", timeframe: "daily", presetName: "Preset 2"}]
const presets2 = [{_id: "presetId2", config: `{"mode": "words", "words": 25}`, name: "Preset 2", tagId: "tagId2"}]

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
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    const goals: GoalWithPresetAndTag[] = [{presetId: "presetId1", name: "Normal", id: "lol", type: "count", measure: 2, presetName: "Preset 1", tagId: "tagId1", timeframe: "daily"}]
    const goalsObj = { tagId1: { name: "tag 1"}}
    const verbose = false
    
    // @ts-ignore
    await printGoalsTable(goals, goalsObj, {}, verbose);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(tableSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    tableSpy.mockRestore();
    infoSpy.mockRestore();
  });

  test("should print goals table (verbose)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    const goals: GoalWithPresetAndTag[] = [
      {presetId: "presetId1", name: "Goal 1", id: "lol", type: "count", measure: 2, presetName: "Preset 1", tagId: "tagId1", timeframe: "daily"},
      {presetId: "presetId2", name: "Goal 2", id: "lol", type: "time", measure: 60000, presetName: "Preset 2", tagId: "tagId2", timeframe: "daily"}
    ]
    const goalsObj: GoalsObject = {
      // @ts-ignore
      tagId1: { 
        name: "tag 1",
        count: 2,
        // @ts-ignore
        presetConfig: { mode: "words", words: 25, difficulty: "master", language: "english", oppositeShiftMode: true, minWpmCustomSpeed: 70, minAccCustom: 100, minBurstCustomSpeed: 100 }
      },
      // @ts-ignore
      tagId2: { 
        name: "tag 2",
        count: 2,
        totalSeconds: 60,
        // @ts-ignore
        presetConfig: { mode: "time", time: 15, difficulty: "master", language: "english", oppositeShiftMode: false, minWpmCustomSpeed: 70, minAccCustom: 100, minBurstCustomSpeed: 100 }
      }
    }
    const verbose = true
    
    // @ts-ignore
    await printGoalsTable(goals, goalsObj, {}, verbose);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(tableSpy).toHaveBeenCalledTimes(1);
    expect(tableSpy).toHaveBeenCalledWith([
      {
        "name": "Goal 1",
        "pb date": "N/A",
        "associated preset": "tag 1",
        "status": "✅",
        "streak": "🧊 0d",
        "target": 2,
        "to go": 0,
        "total tests": 2,
        "total time": "0 minutes",
        "type": "count",
        "❌ failed": 0,
        "🏆 pb": "N/A",
      },
      {
        "name": "Goal 2",
        "pb date": "N/A",
        "associated preset": "tag 2",
        "status": "✅",
        "streak": "🧊 0d",
        "target": "1 minute",
        "to go": 0,
        "total tests": 2,
        "total time": "1 minute",
        "type": "time",
        "❌ failed": 0,
        "🏆 pb": "N/A",
      },
    ], [
      "status",
      "name",
      "type",
      "target",
      "to go",
      "streak",
      "total time",
      "total tests",
      "❌ failed",
      "🏆 pb",
      "pb date",
      "associated preset",
    ])
    expect(infoSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    tableSpy.mockRestore();
    infoSpy.mockRestore();
  });

  test("should show 🔥 streak when streak is non-zero", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    const goals: GoalWithPresetAndTag[] = [
      {presetId: "presetId1", name: "Goal 1", id: "g1", type: "count", measure: 2, presetName: "Preset 1", tagId: "tagId1", timeframe: "daily"},
    ]
    // @ts-ignore
    const goalsObj: GoalsObject = { tagId1: { name: "tag 1", count: 3, presetConfig: {} } }
    const streaks = { g1: 3 }

    // @ts-ignore
    printGoalsTable(goals, goalsObj, streaks, false)

    expect(tableSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ "streak": "🔥 3d" })]),
      expect.any(Array)
    )

    logSpy.mockRestore();
    tableSpy.mockRestore();
    infoSpy.mockRestore();
  });

  test("should show 🧊 Nd when streak is 0", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    const goals: GoalWithPresetAndTag[] = [
      {presetId: "presetId1", name: "Goal 1", id: "g1", type: "count", measure: 2, presetName: "Preset 1", tagId: "tagId1", timeframe: "daily"},
    ]
    // @ts-ignore
    const goalsObj: GoalsObject = { tagId1: { name: "tag 1", count: 1, presetConfig: {} } }
    const streaks = { g1: 0 }

    // @ts-ignore
    printGoalsTable(goals, goalsObj, streaks, false)

    expect(tableSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ "streak": "🧊 0d" })]),
      expect.any(Array)
    )

    logSpy.mockRestore();
    tableSpy.mockRestore();
    infoSpy.mockRestore();
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
  ("throws validateMeasure($measure, $type) -> $expected", ({measure, type, expected}) => {
    const logSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    expect(() => validateMeasure(measure, type)).toThrow(
      new Error(expected),
    )

    expect(logSpy).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });

  test.each([
    { measure: "10", type: "count", expected: "10" },
    { measure: "2", type: "count", expected: "2" },
    { measure: "100ms", type: "time", expected: "100" },
    { measure: "2 seconds", type: "time", expected: "2000" },
    { measure: "30 minutes", type: "time", expected: "1800000" },
    { measure: "1 hour", type: "time", expected: "3600000" },
  ])
  ("validateMeasure($measure, $type) -> $expected", ({measure, type, expected}) => {
    expect(validateMeasure(measure, type)).toBe(expected)
  });
});

describe("validateType", () => {
  test.each([
    { type: "count", expected: "count" },
    { type: "", expected: "Invalid goal type" },
    { type: "none", expected: "Invalid goal type" },
    { type: "time", expected: "time" },
  ])
  ("throws validateType($type) -> $expected", async ({type, expected}) => {
    const logSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    if (type === expected) {
      expect(validateType(type)).toBe(
        expected
      )
    } else {
      expect(() => validateType(type)).toThrow(
        new Error(expected),
      )

      expect(logSpy).toHaveBeenCalledTimes(1);
    }
    
    logSpy.mockRestore();
  });
});

describe("commandGoals", () => {
  test.each([
    { args: [], goals: [], tags: [], presets: [], results: [], logOutput: `No goals created yet. Type \"goals create\" to create a goal.`},
    { args: [], goals: [{}], tags: [], presets: [], results: [], logOutput: `No tags for this user in the database. Type "tags" to fetch tags for this user.`},
    { args: [], goals: [{}], tags: [{}], presets: [], results: [], logOutput: `No presets for this user in the database. Type "presets" to fetch presets for this user.`},
    { args: [], goals: goals1, tags: tags1, presets: presets1, results: allResults1, logOutput: `Today"s Goals (Since 6/15/2026, 5:00:00 PM):`},
  ])
  ("commandGoals(state, $args)", async ({args, goals, tags, presets, results, logOutput}) => {
    const state = new State()
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    const getGoalsByUserIdSpy = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals)
    const getResultsByUserIdAndAfterTimestampSpy = vi.spyOn(state.query, "getResultsByUserIdAndAfterTimestamp").mockResolvedValue([])
    const getResultsSpy = vi.spyOn(state.monkeytype, "getResults").mockResolvedValue(results)
    const getTagsSpy = vi.spyOn(state.query, "getTags").mockResolvedValue(tags)
    const getPresetsSpy = vi.spyOn(state.query, "getPresets").mockResolvedValue(presets)

    // @ts-ignore
    await commandGoals(state, args)

    if (!results.length) {
      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith(logOutput)
    } else {
      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(tableSpy).toHaveBeenCalledTimes(1)
      expect(infoSpy).toHaveBeenCalledTimes(1)
    }
    
    expect(getGoalsByUserIdSpy).toHaveBeenCalledTimes(1)
    if (tags.length) {
      expect(getTagsSpy).toHaveBeenCalledTimes(1)
    }
    
    if (presets.length) {
      expect(getPresetsSpy).toHaveBeenCalledTimes(1)
    }

    errorSpy.mockRestore()
    tableSpy.mockRestore()
    logSpy.mockRestore()
    infoSpy.mockRestore()
    getGoalsByUserIdSpy.mockRestore()
    getResultsByUserIdAndAfterTimestampSpy.mockRestore()
    getResultsSpy.mockRestore()
    getTagsSpy.mockRestore()
    getPresetsSpy.mockRestore()
  });

  test.each([
    { args: [], logOutput: ``, results: {data: [], message: "Results"}},
  ])
  ("commandGoals(state, $args)", async ({args, logOutput, results}) => {
    // Here we tell Vitest to mock fetch on the `window` object.
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(results),
      }),
    );

    const state = new State()
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    const getGoalsByUserIdSpy = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals1)
    const getResultsByUserIdAndAfterTimestampSpy = vi.spyOn(state.query, "getResultsByUserIdAndAfterTimestamp").mockResolvedValue([])
    const getResultsSpy = vi.spyOn(state.monkeytype, "getResults").mockResolvedValue(allResults1)
    const getTagsSpy = vi.spyOn(state.query, "getTags").mockResolvedValue(tags1)
    const getPresetsSpy = vi.spyOn(state.query, "getPresets").mockResolvedValue(presets1)

    // @ts-ignore
    await commandGoals(state, args)

    if (allResults1.length) {
      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(tableSpy).toHaveBeenCalledTimes(1)
      expect(infoSpy).toHaveBeenCalledTimes(1)
    }

    expect(getGoalsByUserIdSpy).toHaveBeenCalledTimes(1)
    expect(getTagsSpy).toHaveBeenCalledTimes(1)

    tableSpy.mockRestore()
    logSpy.mockRestore()
    infoSpy.mockRestore()
    getGoalsByUserIdSpy.mockRestore()
    getResultsByUserIdAndAfterTimestampSpy.mockRestore()
    getResultsSpy.mockRestore()
    getTagsSpy.mockRestore()
    getPresetsSpy.mockRestore()
  });

  test.each([
    { args: [], goal: goals2[0], goals: goals1, presets: [...presets1, ...presets2], test_path: "unable to connect to database error"},
    { args: ["create"], goal: goals2[0], goals: goals1, presets: [...presets1, ...presets2], test_path: "goal name already exists"},
    { args: ["create"], goal: goals2[0], goals: goals1, presets: [...presets1, ...presets2], test_path: "invalid goal type entered"},
    { args: ["create"], goal: goals2[0], goals: goals1, presets: [...presets1, ...presets2], test_path: "invalid goal measure entered"},
    { args: ["create"], goal: goals2[0], goals: goals1, presets: [...presets1, ...presets2], test_path: "no preset found"},
    { args: ["create"], goal: goals2[0], goals: [], presets: [{...presets1[0], tagId: ""}, ...presets2], test_path: "no tag found"},
    { args: ["create"], goal: goals2[0], goals: goals1, presets: [...presets1, ...presets2], test_path: "already a goal associated with this preset"},
    { args: ["create"], goal: goals1[0], goals: [], presets: presets1, test_path: "success"},
    { args: ["create"], goal: goals1[0], goals: [], presets: presets1, test_path: "invalid goal name entered"},
    { args: ["edit"], goal: goals1[0], goals: goals1, presets: presets1, test_path: "success"},
    { args: ["edit"], goal: goals1[0], goals: goals1, presets: presets1, test_path: "invalid goal name"},
    { args: ["edit"], goal: goals1[0], goals: goals1, presets: presets1, test_path: "no goal associated with this account"},
    { args: ["edit"], goal: goals1[0], goals: [...goals1, ...goals2], presets: presets1, test_path: "new goal name already exists"},
    { args: ["edit"], goal: goals1[0], goals: [...goals1, ...goals2], presets: presets1, test_path: "invalid new goal name entered"},
    { args: ["edit"], goal: goals1[0], goals: [...goals1, ...goals2], presets: presets1, test_path: "invalid new goal type"},
    { args: ["edit"], goal: goals1[0], goals: [...goals1, ...goals2], presets: presets1, test_path: "invalid new goal measure"},
    { args: ["edit"], goal: goals1[0], goals: [...goals1, ...goals2], presets: [...presets1, ...presets2], test_path: "invalid new goal preset name - existing goal with this preset"},
    { args: ["edit"], goal: goals1[0], goals: [...goals1, ...goals2], presets: presets1, test_path: "invalid new goal preset name - no preset"},
    { args: ["edit"], goal: goals1[0], goals: goals1, presets: [...presets1, {...presets2[0], tagId: ""}], test_path: "invalid new goal preset name - no tag"},
    { args: ["delete"], goal: goals1[0], goals: goals1, presets: presets1, test_path: "success"},
    { args: ["delete"], goal: goals1[0], goals: goals1, presets: presets1, test_path: "invalid goal name"},
    { args: ["delete"], goal: goals1[0], goals: goals1, presets: presets1, test_path: "no goal associated with this account"},
  ])
  ("commandGoals(state, $args) $test_path", async ({args, goal, goals, presets, test_path}) => {
    const state = new State()

    let getGoalsByUserIdSpy
    let getPresetsSpy
    let getGoalByNameSpy
    let editGoalByIdSpy
    let createGoalSpy
    let deleteGoalByName
    
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    const associatedPreset = presets.find((preset) => preset._id === goal.presetId) || {name: "No Preset"}

    if (args.length > 0) {
      if (args[0] === "create") {
        getGoalsByUserIdSpy = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals)
        getPresetsSpy = vi.spyOn(state.query, "getPresets").mockResolvedValue(presets)

        if (test_path === "invalid goal name entered") {
          // Invalid Name
          vi.mocked(read).mockResolvedValueOnce("")
        } else if (test_path === "goal name already exists") {
          // Goal Name That Already Exists
          vi.mocked(read).mockResolvedValueOnce(goals[0].name)
        }

        // Name
        vi.mocked(read).mockResolvedValueOnce(goal.name);

        if (test_path === "goal name already exists") {
          getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                                .mockResolvedValueOnce(true)
        }

        getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                                .mockResolvedValueOnce(false)

        if (test_path === "invalid goal type entered") {
          // Invalid Type
          vi.mocked(read).mockResolvedValueOnce(goal.name);
        }

        // Valid Type
        vi.mocked(read).mockResolvedValueOnce(goal.type);

        if (test_path === "invalid goal measure entered") {
          // Invalid Measure
          vi.mocked(read).mockResolvedValueOnce(goal.name);
        }

        // Valid Measure
        vi.mocked(read).mockResolvedValueOnce(goal.measure);
        
        if (test_path === "no preset found") {
          // Invalid Preset Name
          vi.mocked(read).mockResolvedValueOnce("");
        } else if (test_path === "no tag found") {
          // Invalid Preset Name
          vi.mocked(read).mockResolvedValueOnce(presets[0].name);
        } else if (test_path === "already a goal associated with this preset") {
          // Preset Name Already Associated with Goal
          vi.mocked(read).mockResolvedValueOnce(presets[0].name);
        }

        // Valid Preset Name
        vi.mocked(read).mockResolvedValueOnce(associatedPreset?.name);

        createGoalSpy = vi.spyOn(state.query, "createGoal").mockResolvedValue({name: goal.name})
      } else if (args[0] === "edit") {
        getGoalsByUserIdSpy = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals)
        getPresetsSpy = vi.spyOn(state.query, "getPresets").mockResolvedValue(presets)

        if (test_path === "invalid goal name") {
          // Invalid Existing Name
          vi.mocked(read).mockResolvedValueOnce("");
        } else if (test_path === "no goal associated with this account") {
          // Invalid Existing Name
          vi.mocked(read).mockResolvedValueOnce("Goal 999");
        }

        // Valid Existing Name
        vi.mocked(read).mockResolvedValueOnce(goal.name);

        if (test_path === "no goal associated with this account") {
          getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                              .mockResolvedValueOnce(false)
        }

        getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                              .mockResolvedValueOnce(goal)

        if (test_path === "new goal name already exists") {
          // Invalid Existing New Name
          vi.mocked(read).mockResolvedValueOnce(goals[1].name);

          getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                                .mockResolvedValueOnce(true)
        } else if (test_path === "invalid new goal name entered") {
          // Invalid Existing New Name
          vi.mocked(read).mockResolvedValueOnce("")
        }

        // New Name
        vi.mocked(read).mockResolvedValueOnce(goal.name + ".1");

        getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                              .mockResolvedValueOnce(false)

        if (test_path === "invalid new goal type") {
          // Invalid New Type
          vi.mocked(read).mockResolvedValueOnce("");
        }

        // New Type
        vi.mocked(read).mockResolvedValueOnce(goal.type);


        if (test_path === "invalid new goal measure") {
           vi.mocked(read).mockResolvedValueOnce("");
        }

        // New Measure
        vi.mocked(read).mockResolvedValueOnce(goal.measure);

        if (test_path === "invalid new goal preset name - existing goal with this preset") {
          // Invalid Preset Name
          vi.mocked(read).mockResolvedValueOnce(presets[1].name);
        } else if (test_path === "invalid new goal preset name - no preset") {
          // Invalid Preset Name
          vi.mocked(read).mockResolvedValueOnce("");
        } else if (test_path === "invalid new goal preset name - no tag") {
          // Invalid Preset Name
          vi.mocked(read).mockResolvedValueOnce(presets[1].name);
        }

        // New Preset Name
        vi.mocked(read).mockResolvedValueOnce(goal.presetName);

        editGoalByIdSpy = vi.spyOn(state.query, "editGoalById").mockResolvedValueOnce({name: goal.name + ".1"})
      } else if (args[0] === "delete") {
        getGoalsByUserIdSpy = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals)

        if (test_path === "invalid goal name") {
          // Invalid Existing Name
          vi.mocked(read).mockResolvedValueOnce("");
        } else if (test_path === "no goal associated with this account") {
          // No Goal Associated With This Name
          vi.mocked(read).mockResolvedValueOnce("Goal 2");
        }

        // Existing Name
        vi.mocked(read).mockResolvedValueOnce(goal.name);

        if (test_path === "no goal associated with this account") {
          getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                              .mockResolvedValueOnce(false)
        }

        getGoalByNameSpy = vi.spyOn(state.query, "getGoalByName")
                              .mockResolvedValueOnce(true)

        // Confirm deletion
        vi.mocked(read).mockResolvedValueOnce("y")

        deleteGoalByName = vi.spyOn(state.query, "deleteGoalByName").mockResolvedValueOnce({name: goal.name})
      }
    } else {
      if (test_path === "unable to connect to database error") {
        getGoalsByUserIdSpy = vi.spyOn(state.query, "getGoalsByUserId").mockRejectedValueOnce(new Error("unable to connect to database error"))
      }
    }

    // @ts-ignore
    const output = await commandGoals(state, args)

    if (args.length > 0) {

      expect(output).toMatch(/Success/)

      if (args[0] === "create") {
        if (test_path === "success") {
          expect(output).toBe(`Successfully created a new goal named "Goal 1"`)
        } else if (test_path === "invalid goal name entered") {
          expect(errorSpy).toHaveBeenCalledWith(`Please enter a valid goal name.`)
          expect(output).toBe(`Successfully created a new goal named "Goal 1"`)
        } else if (test_path === "goal name already exists") {
          expect(errorSpy).toHaveBeenCalledWith(`Goal already exists. Please enter another goal name.`)
          expect(output).toBe(`Successfully created a new goal named "Goal 2"`)
        } else if (test_path === "invalid goal type entered") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no goal type, "${goal.name}". Enter in either "time" or "count" as a goal type`)
          expect(output).toBe(`Successfully created a new goal named "Goal 2"`)
        } else if (test_path === "invalid goal measure entered") {
          expect(errorSpy).toHaveBeenCalledWith(`Invalid number of tests entered "${goal.name}". Enter in a valid number greater than 0.`)
          expect(output).toBe(`Successfully created a new goal named "Goal 2"`)
        } else if (test_path === "no preset found") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no preset with the name "" associated with this account. Run "presets" command to get your fresh presets from MonkeyType or enter another preset name.`)
          expect(output).toBe(`Successfully created a new goal named "Goal 2"`)
        } else if (test_path === "no tag found") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no tag associated with preset "${presets[0].name}" on this account. Verify a tag exists on this preset. If a tag exists, please report the data syncing issue.`)
          expect(output).toBe(`Successfully created a new goal named "Goal 2"`)
        } else if (test_path === "already a goal associated with this preset") {
          expect(errorSpy).toHaveBeenCalledWith(`There is already a goal "${goals[0].name}" associated with this preset. Enter another preset name.`)
          expect(output).toBe(`Successfully created a new goal named "Goal 2"`)
        }
      } else if (args[0] === "edit") {
        if (test_path === "success") {
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "invalid goal name") {
          expect(errorSpy).toHaveBeenCalledWith(`Please enter a valid goal name.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "no goal associated with this account") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no goal "Goal 999" associated with this account. Enter another goal name.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "new goal name already exists") {
          expect(errorSpy).toHaveBeenCalledWith(`There is already a goal "Goal 2" associated with this account. Enter a different new goal name.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "invalid new goal name entered") {
          expect(errorSpy).toHaveBeenCalledWith(`Please enter a new valid goal name.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "invalid new goal type") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no goal type, "". Enter in either "time" or "count" as a goal type`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "invalid new goal measure") {
          expect(errorSpy).toHaveBeenCalledWith(`Invalid number of tests entered "". Enter in a valid number greater than 0.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "invalid new goal preset name - existing goal with this preset") {
          expect(errorSpy).toHaveBeenCalledWith(`There is already a goal "${goals[1].name}" associated with this preset. Enter another preset name.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "invalid new goal preset name - no preset") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no preset with the name "" associated with this account. Run "presets" command to get your fresh presets from MonkeyType or enter another preset name.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        } else if (test_path === "invalid new goal preset name - no tag") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no tag associated with preset "${presets[1].name}" on this account. Verify a tag exists on this preset. If a tag exists, please report the data syncing issue.`)
          expect(output).toBe(`Successfully edited the goal named "Goal 1.1"`)
        }
      } else if (args[0] === "delete") {
        if (test_path === "success") {
          expect(output).toBe(`Successfully deleted the goal named "Goal 1"`)
        } else if (test_path === "invalid goal name") {
          expect(errorSpy).toHaveBeenCalledWith(`Please enter a valid goal name.`)
          expect(output).toBe(`Successfully deleted the goal named "Goal 1"`)
        } else if (test_path === "no goal associated with this account") {
          expect(errorSpy).toHaveBeenCalledWith(`There is no goal "Goal 2" associated with this account. Please enter another goal name.`)
          expect(output).toBe(`Successfully deleted the goal named "Goal 1"`)
        }
      }

      if (args[0] === "create") {
        getGoalsByUserIdSpy?.mockRestore()
        getPresetsSpy?.mockRestore()

        getGoalByNameSpy?.mockRestore()
        createGoalSpy?.mockRestore()
      } else if (args[0] === "edit") {
        getGoalsByUserIdSpy?.mockRestore()
        getPresetsSpy?.mockRestore()

        getGoalByNameSpy?.mockRestore()
        editGoalByIdSpy?.mockRestore()
      } else if (args[0] === "delete") {
        getGoalsByUserIdSpy?.mockRestore()

        getGoalByNameSpy?.mockRestore()
        deleteGoalByName?.mockRestore()
      }
    } else {
      if (test_path === "unable to connect to database error") {
        expect(errorSpy).toHaveBeenCalledWith(`An error occurred executing "goals" command: unable to connect to database error. Please try again.`)
      }
    }

    successSpy?.mockRestore()
    errorSpy?.mockRestore()
  });
});

describe("createGoalsObject", () => {
  test.each([
    {
      goals: goals1,
      tags: tags1,
      presets: presets1,
      allResults: allResults1,
      expected: goalsObject1,
    },
    {
      goals: goals2,
      tags: tags1,
      presets: presets1,
      allResults: allResults1,
      expected: {},
    },
  ])
  ("createGoalsObject(goals, tags, presets, allResults) -> $expected", ({goals, tags, presets, allResults, expected}) => {
    // @ts-ignore
    expect(createGoalsObject((goals as GoalWithPresetAndTag[]), (tags as Array<TagObject>), (presets as Array<PresetObject>), allResults)).toStrictEqual(expected)
  });
});

describe("createCompleter", () => {
  test.each([
    {
      options: [...goals1, ...goals2, {name: "Normal"}].map(goal => goal.name),
      line: "Goal",
      expected: [["Goal 1", "Goal 2"], "Goal"],
    },
    {
      options: [...goals1, ...goals2].map(goal => goal.name),
      line: "Normal",
      expected: [["Goal 1", "Goal 2"], "Normal"],
    },
  ])
  ("createCompleter($options)($line) -> $expected", ({options, line, expected}) => {
    const completer = createCompleter(options)
    expect(completer(line)).toStrictEqual(expected)
  });
});

describe("showGoalHistory (via commandGoals history)", () => {
  const historyGoal: GoalWithPresetAndTag = {
    id: "g1", tagId: "tagId1", presetId: "presetId1",
    measure: 2, name: "Goal 1", type: "count", timeframe: "daily", presetName: "Preset 1"
  }

  const mockHistoryEntry = {
    id: "h1", goalId: "g1", userId: "u1",
    date: "2026-06-28", met: true,
    name: "Goal 1", type: "count" as const, measure: 2, timeframe: "daily",
    totalMeasure: 3, resultIds: ["r1"],
    minWpm: 80.5, avgWpm: 90.0, maxWpm: 100.0,
    createdAt: new Date(), updatedAt: new Date(),
  }

  test("shows error when no goals exist", async () => {
    const state = new State()
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {})
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([])

    //@ts-ignore
    await commandGoals(state, ["history"])

    expect(errorSpy).toHaveBeenCalledWith('No goals created yet. Type "goals create" to create a goal.')
    errorSpy.mockRestore()
  })

  test("shows error when named goal not found", async () => {
    const state = new State()
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {})
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([historyGoal])

    //@ts-ignore
    await commandGoals(state, ["history", "Nonexistent"])

    expect(errorSpy).toHaveBeenCalledWith('No goal found named "Nonexistent".')
    errorSpy.mockRestore()
  })

  test("shows info when goal has no history (0 streak)", async () => {
    const state = new State()
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([historyGoal])
    vi.spyOn(state.query, "getGoalsHistoryByGoalId").mockResolvedValue([])

    //@ts-ignore
    await commandGoals(state, ["history"])

    expect(infoSpy).toHaveBeenCalledWith('No history recorded yet for goal "Goal 1".')
    infoSpy.mockRestore()
  })

  test("prints history table with 0 streak (🧊)", async () => {
    const state = new State()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {})
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([historyGoal])
    vi.spyOn(state.query, "getGoalsHistoryByGoalId").mockResolvedValue([{ ...mockHistoryEntry, met: false, totalMeasure: 0, minWpm: null, avgWpm: null, maxWpm: null }])
    vi.spyOn(state.query, "computeStreak").mockResolvedValue(0)

    //@ts-ignore
    await commandGoals(state, ["history"])

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("🧊"))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("0d streak"))
    expect(tableSpy).toHaveBeenCalledTimes(1)
    expect(tableSpy).toHaveBeenCalledWith(
      [{ date: "2026-06-28", met: "❌", total: "0", target: "2", "min wpm": "—", "avg wpm": "—", "max wpm": "—" }],
      ["date", "met", "total", "target", "min wpm", "avg wpm", "max wpm"]
    )
    logSpy.mockRestore()
    tableSpy.mockRestore()
  })

  test("prints history table with active streak (🔥)", async () => {
    const state = new State()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {})
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([historyGoal])
    vi.spyOn(state.query, "getGoalsHistoryByGoalId").mockResolvedValue([mockHistoryEntry])
    vi.spyOn(state.query, "computeStreak").mockResolvedValue(5)

    //@ts-ignore
    await commandGoals(state, ["history"])

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("🔥"))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("5d streak"))
    expect(tableSpy).toHaveBeenCalledTimes(1)
    expect(tableSpy).toHaveBeenCalledWith(
      [{ date: "2026-06-28", met: "✅", total: "3", target: "2", "min wpm": "81", "avg wpm": "90", "max wpm": "100" }],
      ["date", "met", "total", "target", "min wpm", "avg wpm", "max wpm"]
    )
    logSpy.mockRestore()
    tableSpy.mockRestore()
  })

  test("filters to named goal only, skips other goals", async () => {
    const historyGoal2: GoalWithPresetAndTag = { ...historyGoal, id: "g2", name: "Goal 2", tagId: "tagId2" }
    const state = new State()
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})
    const getHistorySpy = vi.spyOn(state.query, "getGoalsHistoryByGoalId").mockResolvedValue([])
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([historyGoal, historyGoal2])

    //@ts-ignore
    await commandGoals(state, ["history", "Goal 1"])

    expect(getHistorySpy).toHaveBeenCalledTimes(1)
    expect(getHistorySpy).toHaveBeenCalledWith(state, "g1")
    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(infoSpy).toHaveBeenCalledWith('No history recorded yet for goal "Goal 1".')
    infoSpy.mockRestore()
  })

  test("shows 1/1 days met in header when goal is met", async () => {
    const state = new State()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "table").mockImplementation(() => {})
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([historyGoal])
    vi.spyOn(state.query, "getGoalsHistoryByGoalId").mockResolvedValue([mockHistoryEntry])
    vi.spyOn(state.query, "computeStreak").mockResolvedValue(1)

    //@ts-ignore
    await commandGoals(state, ["history"])

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("1/1 days met"))
  })
});