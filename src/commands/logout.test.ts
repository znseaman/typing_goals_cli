import { describe, test, vi, expect } from "vitest";
import { commandLogout } from "./logout.js";
import { State } from "../state.test.js";

describe("commandLogout", () => {
  test("commandLogout(state) => ", async () => {
    const state = new State()
    const expireTokens = vi.spyOn(state.config, "expireTokens").mockImplementation(() => {});
    
    // @ts-ignore
    const output = await commandLogout(state)

    expect(expireTokens).toHaveBeenCalledTimes(1)
    expect(output).toMatch(/Success/)
    
    expireTokens.mockRestore()
  });
})