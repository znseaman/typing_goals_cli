import { describe, it, expect, vi } from "vitest";
import { printGoalsStatus } from "./commands/profile.js";
import { State } from "./state.test.js";
import { logger } from "./ui/logger.js";

it("minimal printGoalsStatus with no goals returns early", async () => {
  const state = new State()
  vi.spyOn(state.query, "getGoalsByUserId").mockResolvedValue([])
  vi.spyOn(logger, "success").mockImplementation(() => {})
  vi.spyOn(logger, "info").mockImplementation(() => {})

  // @ts-ignore
  await printGoalsStatus(state)
  vi.restoreAllMocks()
})
