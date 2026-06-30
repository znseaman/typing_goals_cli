import { describe, test, vi, expect } from "vitest";
import { commandResults, printResultsTable } from "./results.js";
import { State } from "../state.test.js";
import { logger } from "../ui/logger.js";
import { ResultResponse } from "../monkeytype.js";

const results = [{wpm: 78, raw: 89, accuracy: 79, consistency: 85, charStats: [10, 0, 0, 0], mode: "word", mode2: 25, timestamp: Date.now(), tags: ["tagId1"]}]
const tags = [{_id: "tagId1", personalBests: `{ "words": { "25": [{ "wpm": 50, "timestamp": 1781636303784 }] } }`}]
const results2 = [{wpm: 100, raw: 110, accuracy: 95, consistency: 85, charStats: [10, 0, 0, 0], mode: "word", mode2: 25, timestamp: Date.now() + 897, tags: ["tagId2"]}]

// globally mock the "read" module
vi.mock("read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("read")>()
  return {
    ...actual,
    read: vi.fn(), 
  }
})

describe("printResultsTable", () => {
  test("should print results table", async () => {
    const tableSpy = vi.spyOn(logger, 'table').mockImplementation(() => {});

    // const results = [{wpm: 78, raw: 89, accuracy: 79, consistency: 85, charStats: [10, 0, 0, 0], mode: "word", mode2: 25, timestamp: Date.now(), tags: ["tagId1"]}]
    const tagsObj = { tagId1: { name: "tag 1"}}
    
    // @ts-ignore
    await printResultsTable(results, tagsObj);

    expect(tableSpy).toHaveBeenCalledTimes(1);

    tableSpy.mockRestore();
  });

  test("should print no results message when there are no results", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

    const results: ResultResponse[] = []
    const tagsObj = { tagId1: { name: "tag 1"}}
    
    // @ts-ignore
    await printResultsTable(results, tagsObj);

    expect(tableSpy).toHaveBeenCalledTimes(0);
    expect(infoSpy).toHaveBeenCalledWith(`No results to display yet! Take a test to see your results here.`)

    infoSpy.mockRestore();
    tableSpy.mockRestore();
  });
});

describe("commandResults", () => {
  test.each([
    { args: [], results: results, tags: tags },
  ])
  ('commandResults(state, $args) => ', async ({args, results, tags}) => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const state = new State()

    const date = new Date(2012, 1, 1, 13);
    vi.setSystemTime(date);

    const getResultsFromDB = vi.spyOn(state.query, "getResultsByUserIdAndAfterTimestamp").mockResolvedValue(results)
    const getTagsSpy = vi.spyOn(state.query, "getTags").mockResolvedValue(tags)
    const getResultsFromMT = vi.spyOn(state.monkeytype, "getResults").mockResolvedValue({data: results2})

    // @ts-ignore
    await commandResults(state, args)
    
    logSpy.mockRestore()
    tableSpy.mockRestore()
    getResultsFromDB.mockRestore()
    getTagsSpy.mockRestore()
    getResultsFromMT.mockRestore()
    infoSpy.mockRestore()
  });
})