import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { commandDoctor } from "./doctor.js";
import { State } from "../state.test.js";
import * as drizzle from "drizzle-orm"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { logger } from "../ui/logger.js";

// globally mock the "sql" module
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    sql: {
      raw: vi.fn()
    }, 
  }
})

// globally mock the "read" module
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>()
  return {
    ...actual,
    readFile: vi.fn(), 
  }
})

// globally mock the "path" module
vi.mock("node:path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:path")>()
  return {
    ...actual,
    join: vi.fn(), 
  }
})

describe("commandDoctor", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let state: Record<string, any>;
  let execute: ReturnType<typeof vi.spyOn>;
  let raw: ReturnType<typeof vi.spyOn>;
  let readFile: ReturnType<typeof vi.mocked>;
  let pathJoin: ReturnType<typeof vi.mocked>;
  let successSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let isTokenValid: ReturnType<typeof vi.spyOn>;
  let getConfig: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state = new State();
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    raw = vi.spyOn(drizzle.sql, "raw").mockImplementation(() => ({} as any));
    pathJoin = vi.mocked(path.join).mockResolvedValue("");
    successSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each([
    {NODE_VERSION: "13", POSTGRES_DB_VERSION: "1", validToken: false, displayName: "", test_path: "error"},
    {NODE_VERSION: "13", POSTGRES_DB_VERSION: "", validToken: false, displayName: "", test_path: "error"},
    {NODE_VERSION: "24.17.0", POSTGRES_DB_VERSION: "18", validToken: true, displayName: "Bob", test_path: "success"},
  ])("commandDoctor - node $NODE_VERSION - psql $POSTGRES_DB_VERSION - displayName $displayName - test_path $test_path", async ({NODE_VERSION, POSTGRES_DB_VERSION, validToken, displayName, test_path}) => {
    readFile = vi.mocked(fs.readFile).mockResolvedValue(NODE_VERSION)
    execute = vi.spyOn(state.db, "execute").mockResolvedValue({rows: [{version: POSTGRES_DB_VERSION}]});
    isTokenValid = vi.spyOn(state.config, "isTokenValid").mockResolvedValue(validToken);
    getConfig = vi.spyOn(state.config, "get").mockReturnValueOnce(displayName);

    process.env.POSTGRES_DB_VERSION = POSTGRES_DB_VERSION;

    // @ts-ignore
    const output = await commandDoctor(state);

    if (test_path === "error") {
      expect(errorSpy).toHaveBeenNthCalledWith(1, `NodeJS ${NODE_VERSION}: (Run \`nvm install ${NODE_VERSION} && nvm use ${NODE_VERSION}\`)`)
    } else if (test_path === "success") {
      expect(successSpy).toHaveBeenNthCalledWith(1, `NodeJS ${NODE_VERSION}`)
      expect(successSpy).toHaveBeenNthCalledWith(2, `PostgreSQL ${POSTGRES_DB_VERSION}`)
      expect(successSpy).toHaveBeenNthCalledWith(3, `MonkeyType account for ${displayName}`)
      expect(output).toMatch(/Success/)
    }
  });
});
