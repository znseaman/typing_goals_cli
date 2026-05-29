import { describe, test, expect, vi } from "vitest";
import { initializeState } from "./state.js";

export const State = vi.fn(
  class {
    readline = {
      prompt: vi.fn(),
      on: function(event: string, callback: Function) {
          return this
      },
      close: vi.fn(),
    };
    commands = {
      help: {
        execute: vi.fn(),
      },
      exit: {
        execute: vi.fn(),
      },
    };
    monkeytype = {
      login: vi.fn()
    };
    config = {
      get: vi.fn(),
      set: vi.fn(),
    };
  },
);

describe("initializeState", () => {
  test("should return State object", () => {
    const state = initializeState();
    expect(state.readline).toBeTruthy();

    const commands = Object.keys(state.commands);
    expect(commands).toContain("help");
    expect(commands).toContain("exit");
  });
});