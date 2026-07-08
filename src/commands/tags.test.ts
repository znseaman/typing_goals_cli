import { describe, test, vi, expect } from "vitest";
import { commandTags } from "./tags.js";
import { State } from "../state.test.js";
import { read } from "read"
import { logger } from "../ui/logger.js";

const goals1 = [{tagId: "tagId1", presetId: "presetId1", measure: 2, name: "Goal 1", type: "count", timeframe: "daily", presetName: "Preset 1"}]
const tags1 = [{_id: "tagId1", personalBests: { "words": { "25": [{ "wpm": 50, "timestamp": 1781636303784 }] } }}]
const presets1 = [{_id: "presetId1", config: { "mode": "words", "words": 25, "tags": ["tagId1"] }, name: "Preset 1", tagId: "tagId1"}]

// globally mock the "read" module
vi.mock("read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("read")>()
  return {
    ...actual,
    read: vi.fn(), 
  }
})

describe("commandTags", () => {
  test.each([
    { args: ["nope"], tags: [], presets: [], goals: [], test_path: "error"},
    { args: ["delete"], tags: [], presets: [], goals: [], test_path: "success"},
    { args: [], tags: tags1, presets: presets1, goals: goals1, test_path: "success"},
  ])
  ('commandTags(state, $args) => ', async ({args, tags, presets, goals, test_path}) => {
    const state = new State();
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  
    let getTagsSpy
    let getTagByIdSpy
    let createTagSpy
    let getPresetsSpy
    let getPresetById
    let editPresetById

    let getGoalsByUserId
    let deleteTagsNotIn
    let deletePresetsNotIn

    if (args.length > 0) {
      if (args[0] === "delete") {
        if (test_path === "success") {
          vi.mocked(read).mockResolvedValue("y")
        }
      }
    } else {
      getTagsSpy = vi.spyOn(state.monkeytype, "getTags").mockResolvedValue({data: tags})
      getTagByIdSpy = vi.spyOn(state.query, "getTagById").mockResolvedValue(false)
      createTagSpy = vi.spyOn(state.query, "createTag").mockResolvedValue(false)

      getPresetsSpy = vi.spyOn(state.monkeytype, "getPresets").mockResolvedValue({data: presets})
      getPresetById = vi.spyOn(state.query, "getPresetById").mockResolvedValue(false)
      editPresetById = vi.spyOn(state.query, "editPresetById").mockResolvedValue(false)

      getGoalsByUserId = vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals)
      deleteTagsNotIn = vi.spyOn(state.query, "deleteTagsNotIn").mockResolvedValue([])
      deletePresetsNotIn = vi.spyOn(state.query, "deletePresetsNotIn").mockResolvedValue([])
    }
    
    // @ts-ignore
    const output = await commandTags(state, args);

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
        expect(logSpy).toHaveBeenCalled();
      }
    }

    getTagsSpy?.mockRestore()
    getTagByIdSpy?.mockRestore()
    createTagSpy?.mockRestore()

    getPresetsSpy?.mockRestore()
    getPresetById?.mockRestore()
    editPresetById?.mockRestore()

    getGoalsByUserId?.mockRestore()
    deleteTagsNotIn?.mockRestore()
    deletePresetsNotIn?.mockRestore()

    successSpy.mockRestore();
    errorSpy.mockRestore();
    tableSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe("commandTags - pruning stale presets/tags", () => {
  test("prints the deleted-tags warning after the tags table", async () => {
    const state = new State()
    const tableSpy = vi.spyOn(logger, "table").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {})

    vi.spyOn(state.monkeytype, "getTags").mockResolvedValue({ data: tags1 })
    vi.spyOn(state.query, "getTagById").mockResolvedValue(true)
    vi.spyOn(state.query, "editTagById").mockResolvedValue({ id: tags1[0]._id, name: "Tag 1" })

    vi.spyOn(state.monkeytype, "getPresets").mockResolvedValue({ data: presets1 })
    vi.spyOn(state.query, "getPresetById").mockResolvedValue(true)
    vi.spyOn(state.query, "editPresetById").mockResolvedValue(true)

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue(goals1)
    vi.spyOn(state.query, "deleteTagsNotIn").mockResolvedValue([{ id: "oldTagId", name: "Old Tag" }])
    vi.spyOn(state.query, "deletePresetsNotIn").mockResolvedValue([])

    // @ts-ignore
    await commandTags(state, [])

    expect(tableSpy).toHaveBeenCalledOnce()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Old Tag"))
    expect(tableSpy.mock.invocationCallOrder[0]).toBeLessThan(warnSpy.mock.invocationCallOrder[0])

    tableSpy.mockRestore()
    debugSpy.mockRestore()
    warnSpy.mockRestore()
  })

  test("warns about presets that still reference a tag that was just deleted", async () => {
    const state = new State()
    const tableSpy = vi.spyOn(logger, "table").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {})

    vi.spyOn(state.monkeytype, "getTags").mockResolvedValue({ data: tags1 })
    vi.spyOn(state.query, "getTagById").mockResolvedValue(true)
    vi.spyOn(state.query, "editTagById").mockResolvedValue({ id: tags1[0]._id, name: "Tag 1" })

    vi.spyOn(state.monkeytype, "getPresets").mockResolvedValue({ data: presets1 })
    vi.spyOn(state.query, "getPresetById").mockResolvedValue(true)
    vi.spyOn(state.query, "editPresetById").mockResolvedValue(true)

    vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([])
    // "tagId1" is the tag presets1[0] references (config.tags: ["tagId1"]) - simulate it having just been pruned
    vi.spyOn(state.query, "deleteTagsNotIn").mockResolvedValue([{ id: "tagId1", name: "Tag 1" }])
    vi.spyOn(state.query, "deletePresetsNotIn").mockResolvedValue([])

    // @ts-ignore
    await commandTags(state, [])

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Preset 1"))

    tableSpy.mockRestore()
    debugSpy.mockRestore()
    warnSpy.mockRestore()
  })
})