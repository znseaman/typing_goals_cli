import { describe, test, vi, expect } from "vitest";
import { commandTags } from "./tags.js";
import { State } from "../state.test.js";
import { read } from "read"
import { logger } from "../ui/logger.js";

const goals1 = [{tagId: "tagId1", presetId: "presetId1", measure: 2, name: "Goal 1", type: "count", timeframe: "daily", presetName: "Preset 1"}]
const tags1 = [{_id: "tagId1", personalBests: `{ "words": { "25": [{ "wpm": 50, "timestamp": 1781636303784 }] } }`}]
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
        expect(tableSpy).toHaveBeenCalledTimes(1);
      }
    }

    getTagsSpy?.mockRestore()
    getTagByIdSpy?.mockRestore()
    createTagSpy?.mockRestore()

    getPresetsSpy?.mockRestore()
    getPresetById?.mockRestore()
    editPresetById?.mockRestore()

    getGoalsByUserId?.mockRestore()

    successSpy.mockRestore();
    errorSpy.mockRestore();
    tableSpy.mockRestore();
    logSpy.mockRestore();
  });
});