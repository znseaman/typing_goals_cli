import { describe, test, expect, vi } from "vitest";
import { initializeReadlineHandlers, initializeState } from "./state.js";
import { logger } from "./ui/logger.js";
import { RefreshTokenResponse } from "./monkeytype.js";

export const State = vi.fn(
  class {
    db = {
      execute: function(obj: object) {
        return this
      },
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
    readlineModule = {
      cursorTo: vi.fn(),
      clearScreenDown: vi.fn(),
      moveCursor: vi.fn(),
    };
    readline = {
      prompt: vi.fn(),
      on: function(event: string, callback: Function) {
          return this
      },
      close: vi.fn(),
    };
    commandHistory = [];
    commands = {
      goals: {
        name: "goals",
        usage: "goals [-v|create|edit|delete] [<name>] [<type>] [<measure>] [<presetName>]",
        examples: [
          "goals",
          "goals -v #verbose",
          "goals create",
          "goals create Normal count 2 normalW25",
          "goals edit",
          "goals delete",
        ],
        execute: vi.fn()
      },
      login: {
        name: "login",
        examples: [
          "login bob@example.com",
        ],
        execute: vi.fn()
      },
      results: {
        name: "results",
        execute: vi.fn()
      },
      help: {
        name: "help",
        description: "List all available commands",
        execute: vi.fn(),
      },
      exit: {
        name: "exit",
        execute: vi.fn(),
      },
    };
    monkeytype = {
      login: vi.fn(),
      getPresets: vi.fn(),
      getTags: vi.fn(),
      getResults: vi.fn(),
      refreshToken: vi.fn(),
    };
    config = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      path: "/fake/path/to/config.json",
      setConfig: vi.fn(),
      isTokenValid: vi.fn(),
      expireTokens: vi.fn(),
      createRequestOptions: vi.fn(),
    };
    stopFullExit = false;
    removeReadline_runNonReadline_addReadline = vi.fn();
    query = {
      deleteGoalByName: vi.fn(),
      editGoalById: vi.fn(),
      getResultsByUserIdAndAfterTimestamp: vi.fn(),
      getGoalsByUserId: vi.fn(),
      getGoalByName: vi.fn(),
      createGoal: vi.fn(),
      getPresets: vi.fn(),
      getTags: vi.fn(),
      getResultById: vi.fn(),
      createResult: vi.fn(),
      getTagById: vi.fn(),
      editTagById: vi.fn(),
      createTag: vi.fn(),
      getPresetById: vi.fn(),
      createPreset: vi.fn(),
      editPresetById: vi.fn(),
      deletePresets: vi.fn(),
      deleteTags: vi.fn(),
      createUser: vi.fn(),
      deleteUsers: vi.fn(),
      getUserById: vi.fn(),
      getUsers: vi.fn(),
    };
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

describe("initializeReadlineHandlers", () => {
  test("should successfully process lines asynchronously - login command", async () => {
    const state = new State()

    const callbacks: { [event: string]: Function } = {};

    state.readline = {
      // @ts-ignore
      on: function(event: string, callback: Function) {
        callbacks[event] = callback;
        return this
      },
      prompt: vi.fn(),
      close: vi.fn()
    }

    // suppress all the "✅ true" statements on tests
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {})

    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})
    const loginCommand = vi.spyOn(state.commands.login, "execute").mockResolvedValue(true)
    const exitCommand = vi.spyOn(state.commands.exit, "execute").mockImplementationOnce(() => {})
    const commandHistoryPush = vi.spyOn(state.commandHistory, "push")
    const promptSpy = vi.spyOn(state.readline, "prompt")

    const isTokenValid = vi.spyOn(state.config, "isTokenValid").mockReturnValueOnce(false)

    // @ts-ignore
    initializeReadlineHandlers(state);

    if (callbacks["line"]) {
      await callbacks["line"]("login")
    }

    expect(commandHistoryPush).toHaveBeenCalledTimes(1)
    expect(loginCommand).toHaveBeenCalledTimes(1)

    successSpy.mockRestore()
    infoSpy.mockRestore()
    loginCommand.mockRestore()
    exitCommand.mockRestore()
    promptSpy.mockRestore()
    commandHistoryPush.mockRestore()
    isTokenValid.mockRestore()
  });

  test("should prompt user to login b/c invalid token and no refresh token - results command", async () => {
    const state = new State()

    const callbacks: { [event: string]: Function } = {};

    state.readline = {
      // @ts-ignore
      on: function(event: string, callback: Function) {
        callbacks[event] = callback;
        return this
      },
      prompt: vi.fn(),
      close: vi.fn()
    }

    const exitCommand = vi.spyOn(state.commands.exit, "execute").mockImplementationOnce(() => {})

    const commandHistoryPush = vi.spyOn(state.commandHistory, "push")
    const promptSpy = vi.spyOn(state.readline, "prompt")

    const isTokenValid = vi.spyOn(state.config, "isTokenValid").mockReturnValueOnce(false)
    const getConfig = vi.spyOn(state.config, "get").mockReturnValueOnce(false)

    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})

    // @ts-ignore
    initializeReadlineHandlers(state);

    if (callbacks["line"]) {
      await callbacks["line"]("results")
    }

    expect(commandHistoryPush).toHaveBeenCalledTimes(1)
    expect(isTokenValid).toHaveBeenCalledTimes(1)
    expect(getConfig).toHaveBeenCalledTimes(1)
    expect(infoSpy).toHaveBeenNthCalledWith(1, `Type "login" to reconnect.`)

    exitCommand.mockRestore()
    promptSpy.mockRestore()
    commandHistoryPush.mockRestore()
    isTokenValid.mockRestore()
  });

  test("should set config when token is invalid and refresh token creates new token - results command", async () => {
    const state = new State()

    const callbacks: { [event: string]: Function } = {};

    state.readline = {
      // @ts-ignore
      on: function(event: string, callback: Function) {
        callbacks[event] = callback;
        return this
      },
      prompt: vi.fn(),
      close: vi.fn()
    }

    const exitCommand = vi.spyOn(state.commands.exit, "execute").mockImplementationOnce(() => {})

    const resultsCommand = vi.spyOn(state.commands.results, "execute").mockImplementationOnce(() => {})

    const commandHistoryPush = vi.spyOn(state.commandHistory, "push")
    const promptSpy = vi.spyOn(state.readline, "prompt")

    const isTokenValid = vi.spyOn(state.config, "isTokenValid").mockReturnValueOnce(false)
    const getConfig = vi.spyOn(state.config, "get").mockReturnValueOnce(true)
    const refreshToken = vi.spyOn(state.monkeytype, "refreshToken").mockResolvedValueOnce({
      access_token: "string",
      expires_in: "string",
      token_type: "string",
      refresh_token: "string",
      id_token: "string",
      user_id: "string",
      project_id: "string",
    } as RefreshTokenResponse)
    const setConfig = vi.spyOn(state.config, "setConfig").mockImplementation(() => {})

    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})

    // @ts-ignore
    initializeReadlineHandlers(state);

    if (callbacks["line"]) {
      await callbacks["line"]("results")
    }

    expect(commandHistoryPush).toHaveBeenCalledTimes(1)
    expect(isTokenValid).toHaveBeenCalledTimes(1)
    expect(getConfig).toHaveBeenCalledTimes(1)
    expect(infoSpy).toHaveBeenNthCalledWith(1, `Type "login" to reconnect.`)

    getConfig.mockRestore()
    refreshToken.mockRestore()
    setConfig.mockRestore()
    infoSpy.mockRestore()
    exitCommand.mockRestore()
    resultsCommand.mockRestore()
    promptSpy.mockRestore()
    commandHistoryPush.mockRestore()
    isTokenValid.mockRestore()
  });
});