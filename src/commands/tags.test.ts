import { describe, test, vi, expect } from "vitest";
import { commandTags } from "./tags.js";
import { State } from "../state.test.js";
import { read } from "read"

// globally mock the "read" module
vi.mock("read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("read")>()
  return {
    ...actual,
    read: vi.fn(), 
  }
})

describe("commandTags", () => {
  test("should fail with unknown subcommand", async () => {
    const state = new State();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const args = ["nope"]
    // @ts-ignore
    await commandTags(state, args);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(`Unknown subcommand: nope. Supported subcommands: delete`)

    errorSpy.mockRestore();
  });

  test("should run tags delete command", async () => {
    const state = new State();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.mocked(read).mockResolvedValue("y")

    const args = ["delete"]
    // @ts-ignore
    await commandTags(state, args);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(`Successfully deleted all your tags and goals from the database!`)

    logSpy.mockRestore();
  });
});