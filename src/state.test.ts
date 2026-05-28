import { describe, test, expect } from "vitest";
import { initializeState } from "./state.js";

describe("initializeState", () => {
  test("should return State object", () => {
    const state = initializeState();
    expect(state.readline).toBeTruthy();

    const commands = Object.keys(state.commands);
    expect(commands).toContain("help");
    expect(commands).toContain("exit");
  });
});