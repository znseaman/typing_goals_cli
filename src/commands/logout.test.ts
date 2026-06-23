import { describe, test, vi, expect } from "vitest";
import { commandLogout } from "./logout.js";
import { State } from "../state.test.js";
import { logger } from "../ui/logger.js";

describe("commandLogout", () => {
  test("commandLogout(state) => ", async () => {
    const state = new State()
    const expireTokens = vi.spyOn(state.config, "expireTokens").mockImplementation(() => {});
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    
    // @ts-ignore
    await commandLogout(state)

    expect(expireTokens).toHaveBeenCalledTimes(1)
    expect(successSpy).toHaveBeenNthCalledWith(1, "Logged out of your MonkeyType account")
    
    expireTokens.mockRestore()
    successSpy.mockRestore()
  });
})