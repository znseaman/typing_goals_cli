import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { commandDb } from "./db.js";
import { State } from "../state.test.js";
import * as drizzle from "drizzle-orm"
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

describe("commandDB", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let state: Record<string, any>;
  let execute: ReturnType<typeof vi.spyOn>;
  let raw: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state = new State()
    log = vi.spyOn(logger, "log").mockImplementation(() => {});
    execute = vi.spyOn(state.db, "execute").mockImplementation(() => {});
    raw = vi.spyOn(drizzle.sql, "raw").mockImplementation(() => ({} as any));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each([
    {ENVIRONMENT: ""},
    {ENVIRONMENT: "prod"},
  ])("should fail to run db command when in production or when not specified", async ({ENVIRONMENT}) => {
    process.env.ENVIRONMENT = ENVIRONMENT
    // @ts-ignore
    await expect(() => commandDb(state)).rejects.toThrow(`This command is not allowed to be used in production!`)
  });

  test.each([
    {ENVIRONMENT: "dev", args: ["SELECT version()"]},
  ])("should successfully to run db command: $args", async ({ENVIRONMENT, args}) => {
    process.env.ENVIRONMENT = ENVIRONMENT

    const [...query] = args

    // @ts-ignore
    const output = await commandDb(state, args);

    expect(log).toHaveBeenNthCalledWith(1, `\nExecute SQL commands against your local database:\n`);
    expect(output).toMatch(/SQL Query Result/);
    expect(raw).toHaveBeenNthCalledWith(1, query.join(" "))
  });
});
