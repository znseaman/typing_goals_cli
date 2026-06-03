import { describe, test, expect, vi } from "vitest";
import { startREPL } from "./repl.js";
import { State } from "./state.test.js";

describe("startREPL", () => {
  test("should print welcome message", async() => {
    const state = new State();
    const promptSpy = vi.spyOn(state.readline, "prompt");
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // @ts-ignore
    await startREPL(state);
    
    expect(logSpy).toHaveBeenCalledTimes(2);

    expect(promptSpy).toHaveBeenCalledTimes(1);

    promptSpy.mockRestore();
    logSpy.mockRestore();
  });
});