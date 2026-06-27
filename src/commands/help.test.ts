import { describe, test, vi, expect } from "vitest";
import { commandHelp } from "./help.js";
import { State } from "../state.test.js";
import { logger } from "../ui/logger.js";

describe("commandHelp", () => {
  test("should display CLI commands", async () => {
    const logSpy = vi.spyOn(logger, "log").mockImplementation(() => {});

    const state = new State();

    // @ts-ignore
    await commandHelp(state);

    expect(logSpy).toHaveBeenCalledTimes(26);

    logSpy.mockRestore();
  });
});