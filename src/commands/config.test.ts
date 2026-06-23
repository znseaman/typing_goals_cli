import { describe, test, vi, expect } from "vitest";
import { State } from "../state.test.js";
import { logger } from "../ui/logger.js";
import { commandConfig } from "./config.js";
import * as fs from "node:fs/promises"

// globally mock the "read" module
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>()
  return {
    ...actual,
    readFile: vi.fn(), 
  }
})

describe("commandConfig", () => {
  test.each([
    { args: ["nope"], tags: [], presets: [], goals: [], test_path: "error"},
    { args: ["delete", "idToken"], tags: [], presets: [], goals: [], test_path: "success"},
    { args: ["get", "idToken"], tags: [], presets: [], goals: [], test_path: "success"},
    { args: ["set", "idToken", "xxxxxx"], tags: [], presets: [], goals: [], test_path: "success"},
    { args: ["set", "idToken"], tags: [], presets: [], goals: [], test_path: "error"},
    { args: [], tags: [], presets: [], goals: [], test_path: "success"},
  ])
  ("commandPresets(state, $args) => ", async ({args, tags, presets, goals, test_path}) => {
    const state = new State();
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
  
    const configSetSpy = vi.spyOn(state.config, "set").mockImplementation(() => {});
    const configGetSpy = vi.spyOn(state.config, "get").mockImplementation(() => {});
    const configDeleteSpy = vi.spyOn(state.config, "delete").mockImplementation(() => {});

    const mockReadFile = vi.mocked(fs.readFile).mockResolvedValue("{}")
    
    // @ts-ignore
    const output = await commandConfig(state, args);

    if (args.length > 0) {
      if (args[0] === "get") {
        if (test_path === "success") {
          expect(configGetSpy).toHaveBeenCalledTimes(1);
          expect(configGetSpy).toHaveBeenNthCalledWith(1, "idToken")
        }
      } else if (args[0] === "set") {
        if (test_path === "success") {
          expect(configSetSpy).toHaveBeenCalledTimes(1);
          expect(configSetSpy).toHaveBeenCalledWith("idToken", "xxxxxx")
          expect(output).toMatch(/Success/)
        } else if (test_path === "error") {
          expect(infoSpy).toHaveBeenCalledTimes(1);
          expect(infoSpy).toHaveBeenCalledWith(`Usage: config ${args[0]} <field> <value>`)
        }
      } else if (args[0] === "delete") {
        if (test_path === "success") {
          expect(configDeleteSpy).toHaveBeenCalledTimes(1);
          expect(configDeleteSpy).toHaveBeenNthCalledWith(1, "idToken")
          expect(output).toMatch(/Success/)
        }
      } else if (args[0] === "path") {
        if (test_path === "success") {
          expect(infoSpy).toHaveBeenCalledTimes(1);
          expect(infoSpy).toHaveBeenCalledWith(`This config is located at: ${state.config.path}`)
        }
      }
    } else {
      if (test_path === "error") {
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(`Unknown subcommand: nope. Supported subcommands: get, set, delete, path`)
      } else {
        expect(mockReadFile).toHaveBeenCalledWith(state.config.path, "utf8");
        expect(infoSpy).toHaveBeenNthCalledWith(1, `Path: ${state.config.path}`)
        expect(infoSpy).toHaveBeenNthCalledWith(2, `User Config: {}`)
      }
    }

    mockReadFile.mockRestore();

    configSetSpy.mockRestore();
    configGetSpy.mockRestore();
    configDeleteSpy.mockRestore();

    successSpy.mockRestore();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    tableSpy.mockRestore();
  });
});