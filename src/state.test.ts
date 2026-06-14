import { describe, test, expect, vi } from "vitest";
import { initializeState } from "./state.js";

export const State = vi.fn(
  class {
    db = {
      delete: function(obj: object) {
        return this
      },
      from: function(obj: object) {
        return this
      },
      fullJoin: function(obj: object) {
        return this
      },
      insert: function(obj: object) {
        return this
      },
      leftJoin: function(obj: object) {
        return this
      },
      select: function(obj: object) {
        return this
      },
      update: function(obj: object) {
        return this
      },
      values: function(obj: object) {
        return this
      },
      where: function(obj: object) {
        return this
      },
      returning: vi.fn()
    };
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
      login: vi.fn(),
      getPresets: vi.fn(),
      getTags: vi.fn(),
    };
    config = {
      get: vi.fn(),
      set: vi.fn(),
    };
    stopFullExit = false;
    removeReadline_runNonReadline_addReadline = vi.fn();
    goalsQueries = {
      getGoalsByUserId: vi.fn()
    }
  },
);

describe("initializeState", () => {
  test("should return State object", async () => {
    const state = await initializeState();
    expect(state.readline).toBeTruthy();

    const commands = Object.keys(state.commands);
    expect(commands).toContain("help");
    expect(commands).toContain("exit");
  });
});