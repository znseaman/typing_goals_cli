import { describe, test, expect, vi } from "vitest";
import { startREPL } from "./repl.js";
import { State } from "./state.test.js";

describe("startREPL", () => {
  test("should print welcome message", async() => {
    const state = new State();
    const promptSpy = vi.spyOn(state.readline, "prompt");
    const onSpy = vi.spyOn(state.readline, "on");
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // @ts-ignore
    await startREPL(state);
    
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(2, `Type 'help' to see the available commands.\n`);

    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(onSpy).toHaveBeenCalledTimes(1);

    promptSpy.mockRestore();
    onSpy.mockRestore();
    logSpy.mockRestore();
  });
});