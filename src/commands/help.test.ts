import { describe, test, vi, expect } from "vitest";
import { commandHelp } from "./help.js";
import { State } from "../state.test.js";

describe("commandHelp", () => {
  test("should display CLI commands", async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const state = new State();

    // @ts-ignore
    await commandHelp(state);

    expect(logSpy).toHaveBeenCalledTimes(10);

    logSpy.mockRestore();
  });
});