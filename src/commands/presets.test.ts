import { describe, test, vi, expect } from "vitest";
import { commandPresets, getExtraPresetOptions } from "./presets.js";
import { State } from "../state.test.js";
import { read } from "read"
import { PresetConfig } from "../monkeytype.js";
import { logger } from "../ui/logger.js";

const goals1 = [{tagId: "tagId1", presetId: "presetId1", measure: 2, name: "Goal 1", type: "count", timeframe: "daily", presetName: "Preset 1"}]
const tags1 = [{_id: "tagId1", name: "Tag 1", personalBests: `{ "words": { "25": [{ "wpm": 50, "timestamp": 1781636303784 }] } }`}]
const presets1 = [{_id: "presetId1", config: { "mode": "words", "words": 25, "tags": ["tagId1"] }, name: "Preset 1", tagId: "tagId1"}]

const presetConfig = {
  difficulty: "master",

  language: "english",
  mode: "words",
  minWpmCustomSpeed: 78,
  minAccCustom: 78,
  minBurstCustomSpeed: 78,
  blindMode: true,

  minWpm: "off",
  minAcc: "off",

  minBurst: "off",

  oppositeShiftMode: "off",
  confidenceMode: "off",
} as PresetConfig

// globally mock the "read" module
vi.mock("read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("read")>()
  return {
    ...actual,
    read: vi.fn(), 
  }
})

describe("commandPresets", () => {
  test.each([
    { args: ["nope"], tags: [], presets: [], goals: [], test_path: "error"},
    { args: ["delete"], tags: [], presets: [], goals: [], test_path: "success"},
    { args: [], tags: tags1, presets: presets1, goals: goals1, test_path: "success - preset exists"},
    { args: [], tags: tags1, presets: presets1, goals: goals1, test_path: "success - preset doesn't exist yet"},
  ])
  ('commandPresets(state, $args) => ', async ({args, tags, presets, goals, test_path}) => {
    const state = new State();
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tableSpy = vi.spyOn(logger, "table").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  
    let getTagsSpy
    let getTagByIdSpy
    let createTagSpy
    let editTagById
    let getPresetsSpy
    let getPresetById
    let editPresetById
    let createPreset

    let getGoalsByUserId

    if (args.length > 0) {
      if (args[0] === "delete") {
        if (test_path === "success") {
          vi.mocked(read).mockResolvedValue("y")
        }
      }
    } else {
      if (test_path == "success - preset exists") {
        getTagsSpy = vi.spyOn(state.monkeytype, "getTags").mockResolvedValue({data: tags})
        getTagByIdSpy = vi.spyOn(state.query, "getTagById").mockResolvedValue(true)
        createTagSpy = vi.spyOn(state.query, "createTag").mockResolvedValue(true)
        editTagById = vi.spyOn(state.query, "editTagById").mockResolvedValue({id: tags[0]._id, name: tags[0].name})

        getPresetsSpy = vi.spyOn(state.monkeytype, "getPresets").mockResolvedValue({data: presets})
        getPresetById = vi.spyOn(state.query, "getPresetById").mockResolvedValue(true)
        editPresetById = vi.spyOn(state.query, "editPresetById").mockResolvedValue(true)

        getGoalsByUserId = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals)
      } else if (test_path === "success - preset doesn't exist yet") {
          getTagsSpy = vi.spyOn(state.monkeytype, "getTags").mockResolvedValue({data: tags})
          getTagByIdSpy = vi.spyOn(state.query, "getTagById").mockResolvedValue(true)
          createTagSpy = vi.spyOn(state.query, "createTag").mockResolvedValue(true)
          editTagById = vi.spyOn(state.query, "editTagById").mockResolvedValue({id: tags[0]._id, name: tags[0].name})

          getPresetsSpy = vi.spyOn(state.monkeytype, "getPresets").mockResolvedValue({data: presets})
          getPresetById = vi.spyOn(state.query, "getPresetById").mockResolvedValue(false)
          // editPresetById = vi.spyOn(state.query, "editPresetById").mockResolvedValue(false)
          createPreset = vi.spyOn(state.query, "createPreset").mockResolvedValue({id: presets[0]._id, name: presets[0].name})

          getGoalsByUserId = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals)
      }
      
    }
    
    // @ts-ignore
    const output = await commandPresets(state, args);

    if (args.length > 0) {
      if (args[0] === "delete") {
        if (test_path === "success") {
          expect(output).toMatch(/Success/)
        }
      }
    } else {
      if (test_path === "error") {
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(`Unknown subcommand: nope. Supported subcommands: delete`)
      } else {
        if (test_path == "success - preset exists") {
          expect(debugSpy).toHaveBeenCalledTimes(2);
          expect(tableSpy).toHaveBeenCalledTimes(1);
        } else if (test_path === "success - preset doesn't exist yet") {
          expect(debugSpy).toHaveBeenCalledTimes(2);
          expect(tableSpy).toHaveBeenCalledTimes(1);
        }
      }
    }

    getTagsSpy?.mockRestore()
    getTagByIdSpy?.mockRestore()
    createTagSpy?.mockRestore()
    editTagById?.mockRestore()

    getPresetsSpy?.mockRestore()
    getPresetById?.mockRestore()
    editPresetById?.mockRestore()
    createPreset?.mockRestore()

    getGoalsByUserId?.mockRestore()

    successSpy.mockRestore();
    errorSpy.mockRestore();
    tableSpy.mockRestore();
    logSpy.mockRestore();
    debugSpy.mockRestore();
  });
});

describe("commandPresets - validation failures", () => {
  test.each([
    {
      description: "non-string _id",
      preset: { _id: 123, config: { mode: "words", words: 25, tags: ["tagId1"] }, name: "Preset 1" },
    },
    {
      description: "missing name",
      preset: { _id: "presetId1", config: { mode: "words", words: 25, tags: ["tagId1"] } },
    },
    {
      description: "wrong type for config field",
      preset: { _id: "presetId1", config: { mode: "words", words: "not-a-number", tags: ["tagId1"] }, name: "Preset 1" },
    },
  ])("skips preset with $description due to validation failure", async ({ preset }) => {
    const state = new State()
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    vi.spyOn(state.monkeytype, "getTags").mockResolvedValue({ data: tags1 })
    vi.spyOn(state.query, "getTagById").mockResolvedValue(true)
    vi.spyOn(state.query, "editTagById").mockResolvedValue({ id: tags1[0]._id, name: tags1[0].name })
    // @ts-ignore
    vi.spyOn(state.monkeytype, "getPresets").mockResolvedValue({ data: [preset] })
    vi.spyOn(state.query, "getPresetById").mockResolvedValue(false)
    const createPresetSpy = vi.spyOn(state.query, "createPreset")
    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals1)

    // @ts-ignore
    await commandPresets(state, [])

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("validation failure"))
    expect(createPresetSpy).not.toHaveBeenCalled()
    // debugSpy called once for editTagById, not for createPreset
    expect(debugSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
    debugSpy.mockRestore()
    logSpy.mockRestore()
  })
})

describe("getExtraPresetOptions", () => {
  test.each([
    { presetConfig: {}, expected: "", description: "should return '' when no preset config exists" },
    { presetConfig: undefined, expected: "N/A", description: "should return 'N/A' when no preset config exists" },
    { presetConfig: presetConfig, expected: "⭐ master", description: "display extra preset options" },
  ])
  ('$description', async ({presetConfig, expected}) => {
    expect(getExtraPresetOptions(presetConfig)).toBe(expected);
  });
});