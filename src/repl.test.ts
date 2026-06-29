import { describe, test, expect, vi } from "vitest";
import { startREPL } from "./repl.js";
import { State } from "./state.test.js";
import { RefreshTokenResponse } from "./monkeytype.js";

describe("startREPL", () => {
  test("should print welcome message", async() => {
    const state = new State();
    const promptSpy = vi.spyOn(state.readline, "prompt");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // @ts-ignore
    await startREPL(state);

    expect(promptSpy).toHaveBeenCalledTimes(1);

    promptSpy.mockRestore();
    logSpy.mockRestore();
  });

  test("should try to refresh token", async() => {
    const state = new State();
    const isTokenValid = vi.spyOn(state.config, "isTokenValid").mockImplementation(() => false);
    const getConfig = vi.spyOn(state.config, "get")
    const refreshToken = vi.spyOn(state.monkeytype, "refreshToken").mockResolvedValueOnce({
      access_token: "string",
      expires_in: "string",
      token_type: "string",
      refresh_token: "string",
      id_token: "string",
      user_id: "string",
      project_id: "string",
    } as RefreshTokenResponse)
    const setConfig = vi.spyOn(state.config, "setConfig").mockImplementation(() => {});
    const promptSpy = vi.spyOn(state.readline, "prompt");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    getConfig.mockReturnValueOnce("Bob")          // displayName
    getConfig.mockReturnValueOnce("xxxxxxxxxx")   // refreshToken
    getConfig.mockReturnValueOnce(false)          // maintainStreak

    // @ts-ignore
    await startREPL(state);

    expect(isTokenValid).toHaveBeenCalledTimes(1);
    expect(getConfig).toHaveBeenCalledTimes(4);
    expect(setConfig).toHaveBeenCalledTimes(1);
    expect(promptSpy).toHaveBeenCalledTimes(1);

    isTokenValid.mockRestore();
    getConfig.mockRestore();
    refreshToken.mockRestore();
    setConfig.mockRestore();
    promptSpy.mockRestore();
    logSpy.mockRestore();
  });
});