import { describe, test, vi, expect } from "vitest";
import { commandPresets } from "./presets.js";
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

describe("commandPresets", () => {
  test("should fail with unknown subcommand", async () => {
    const state = new State();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const args = ["nope"]
    // @ts-ignore
    await commandPresets(state, args);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(`Unknown subcommand: nope. Supported subcommands: delete`)

    errorSpy.mockRestore();
  });

  test("should run presets delete command", async () => {
    const state = new State();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.mocked(read).mockResolvedValue("y")

    const args = ["delete"]
    // @ts-ignore
    await commandPresets(state, args);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(`Successfully deleted all your presets and goals from the database!`)

    logSpy.mockRestore();
  });
});