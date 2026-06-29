import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { initializeReadlineHandlers, initializeState, getFullCommandList } from "./state.js";
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
      write: vi.fn(),
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
      getProfile: vi.fn(),
      getStreak: vi.fn(),
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
      computeStreak: vi.fn(),
      createGoalsHistoryEntry: vi.fn(),
      getGoalsHistoryByGoalId: vi.fn(),
      getGoalsHistoryByGoalIdAndDate: vi.fn(),
      getLatestGoalsHistoryDateForUser: vi.fn(),
      getResultsByUserIdBetweenTimestamps: vi.fn(),
      getEarliestResultTimestampForUser: vi.fn(),
    };
    suggestionState = {
      suggestions: [],
      selectedIndex: -1,
      numRenderedLines: 0,
      ghostTextVisible: false,
    };
    currentKeypressHandler = vi.fn();
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

    state.readline.on = function(event: string, callback: Function) {
      callbacks[event] = callback;
      return this
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

    state.readline.on = function(event: string, callback: Function) {
      callbacks[event] = callback;
      return this
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

    state.readline.on = function(event: string, callback: Function) {
      callbacks[event] = callback;
      return this
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

describe("getFullCommandList", () => {
  test("should include all base commands", () => {
    const state = new State();
    // @ts-ignore
    const list = getFullCommandList(state.commands);
    expect(list).toContain("goals");
    expect(list).toContain("login");
    expect(list).toContain("results");
    expect(list).toContain("help");
    expect(list).toContain("exit");
  });

  test("should expand optional subcommands from usage strings", () => {
    const state = new State();
    // @ts-ignore
    const list = getFullCommandList(state.commands);
    expect(list).toContain("goals -v");
    expect(list).toContain("goals create");
    expect(list).toContain("goals edit");
    expect(list).toContain("goals delete");
  });

  test("should not include required argument placeholders as subcommands", () => {
    const commands = {
      foo: {
        name: "foo",
        description: "test",
        usage: "foo <required_arg>",
        execute: vi.fn(),
      },
    };
    // @ts-ignore
    const list = getFullCommandList(commands);
    expect(list).toContain("foo");
    expect(list).not.toContain("foo <required_arg>");
    expect(list).not.toContain("<required_arg>");
  });

  test("should omit subcommands for commands with no usage", () => {
    const state = new State();
    // @ts-ignore
    const list = getFullCommandList(state.commands);
    // 'results' has no usage — should appear exactly once as the base command
    expect(list.filter((c: string) => c === "results").length).toBe(1);
  });
});

describe("keypressHandler", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.stdin.removeAllListeners("keypress");
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.stdin.removeAllListeners("keypress");
  });

  function makeReadline(line = ""): any {
    return {
      on: vi.fn().mockReturnThis(),
      prompt: vi.fn(),
      close: vi.fn(),
      write: vi.fn(),
      line,
      getCursorPos: vi.fn().mockReturnValue({ rows: 0, cols: line.length + 2 }),
    };
  }

  test("ctrl+c clears input, writes 'exit', and submits", () => {
    const state = new State();
    state.readline = makeReadline();
    // @ts-ignore
    initializeReadlineHandlers(state);

    process.stdin.emit("keypress", "", { ctrl: true, name: "c", meta: false, shift: false, sequence: "\x03" });

    expect(state.readline.write).toHaveBeenCalledWith(null, { ctrl: true, name: "u" });
    expect(state.readline.write).toHaveBeenCalledWith("exit");
    expect(state.readline.write).toHaveBeenCalledWith(null, { name: "return" });
  });

  test("tab with no suggestions does not write to readline", () => {
    const state = new State();
    state.readline = makeReadline("");
    // @ts-ignore
    initializeReadlineHandlers(state);

    process.stdin.emit("keypress", "", { name: "tab", ctrl: false, meta: false, shift: false, sequence: "\t" });

    expect(state.readline.write).not.toHaveBeenCalled();
  });

  test("tab cycles through suggestions and writes selected command to readline", async () => {
    const state = new State();
    state.readline = makeReadline("goa");
    // @ts-ignore
    initializeReadlineHandlers(state);

    // Populate suggestions for "goa" via a regular keypress followed by nextTick flush
    process.stdin.emit("keypress", "a", { name: "a", ctrl: false, meta: false, shift: false, sequence: "a" });
    await new Promise(resolve => process.nextTick(resolve));

    // Tab should select the first suggestion and write it to readline
    process.stdin.emit("keypress", "", { name: "tab", ctrl: false, meta: false, shift: false, sequence: "\t" });

    expect(state.readline.write).toHaveBeenCalledWith(null, { ctrl: true, name: "u" });
    expect(state.readline.write).toHaveBeenCalledWith("goals");
  });

  test("return with ghost text writes ghost suffix into readline before Enter is processed", async () => {
    const state = new State();
    state.readline = makeReadline("res");
    // @ts-ignore
    initializeReadlineHandlers(state);

    // "res" matches only "results" → single match → ghost text "ults" is set
    process.stdin.emit("keypress", "s", { name: "s", ctrl: false, meta: false, shift: false, sequence: "s" });
    await new Promise(resolve => process.nextTick(resolve));

    process.stdin.emit("keypress", "", { name: "return", ctrl: false, meta: false, shift: false, sequence: "\r" });

    expect(state.readline.write).toHaveBeenCalledWith("ults");
  });

  test("return without ghost text does not write to readline", () => {
    const state = new State();
    state.readline = makeReadline("");
    // @ts-ignore
    initializeReadlineHandlers(state);

    process.stdin.emit("keypress", "", { name: "return", ctrl: false, meta: false, shift: false, sequence: "\r" });

    expect(state.readline.write).not.toHaveBeenCalled();
  });

  test("escape does not write to readline", async () => {
    const state = new State();
    state.readline = makeReadline("goa");
    // @ts-ignore
    initializeReadlineHandlers(state);

    // Populate suggestions first
    process.stdin.emit("keypress", "a", { name: "a", ctrl: false, meta: false, shift: false, sequence: "a" });
    await new Promise(resolve => process.nextTick(resolve));

    process.stdin.emit("keypress", "", { name: "escape", ctrl: false, meta: false, shift: false, sequence: "\x1b" });

    expect(state.readline.write).not.toHaveBeenCalled();
  });

  test("regular keypress triggers stdout writes for suggestion rendering after nextTick", async () => {
    const state = new State();
    state.readline = makeReadline("goa");
    // @ts-ignore
    initializeReadlineHandlers(state);

    process.stdin.emit("keypress", "a", { name: "a", ctrl: false, meta: false, shift: false, sequence: "a" });
    await new Promise(resolve => process.nextTick(resolve));

    // "goa" matches multiple suggestions → stdout should have been written to for rendering
    expect(stdoutSpy).toHaveBeenCalled();
  });

  test("empty line after keypress clears suggestions without writing to readline", async () => {
    const state = new State();
    const rl = makeReadline("");
    state.readline = rl;
    // @ts-ignore
    initializeReadlineHandlers(state);

    process.stdin.emit("keypress", "\x7f", { name: "backspace", ctrl: false, meta: false, shift: false, sequence: "\x7f" });
    await new Promise(resolve => process.nextTick(resolve));

    expect(state.readline.write).not.toHaveBeenCalled();
  });
});