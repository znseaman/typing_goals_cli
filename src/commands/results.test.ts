import { describe, test, vi, expect } from "vitest";
import { printResultsTable } from "./results.js";

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
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

    const results = [{wpm: 78, raw: 89, accuracy: 79, consistency: 85, charStats: [10, 0, 0, 0], mode: "word", mode2: 25, timestamp: Date.now(), tags: ["tagId1"]}]
    const tagsObj = { tagId1: { name: "tag 1"}}
    
    // @ts-ignore
    await printResultsTable(results, tagsObj);

    expect(tableSpy).toHaveBeenCalledTimes(1);

    tableSpy.mockRestore();
  });
});

