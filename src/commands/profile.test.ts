import { describe, test, expect, vi, afterEach } from "vitest";
import { commandProfile, printStreak, printAllTimeLeaderboards } from "./profile.js";
import { State } from "../state.test.js";
import { logger } from "../ui/logger.js";

const profileResponse1 = {
  message: "ok",
  data: {
    name: "TestUser",
    addedAt: 1000000000000,
    streak: 5,
    maxStreak: 10,
    xp: 1000,
    typingStats: { startedTests: 100, completedTests: 90, timeTyping: 3600 },
    personalBests: {
      time: { "15": [{ wpm: 100, acc: 98, timestamp: 1000000000000 }] },
      words: { "25": [{ wpm: 90, acc: 97, timestamp: 1000000000000 }] },
    },
    details: { bio: "Test bio", keyboard: "Test keyboard" },
    allTimeLbs: { time: { "15": { english: { rank: 100, count: 1000 } } } },
    uid: "testuid123",
  }
}

const streakClaimed = {
  message: "ok",
  data: { lastResultTimestamp: Date.now(), length: 5, maxLength: 10, hourOffset: 0 }
}

const streakUnclaimed = {
  message: "ok",
  data: { lastResultTimestamp: 0, length: 5, maxLength: 10, hourOffset: 0 }
}

describe("commandProfile", () => {
  test.each([
    { maintainStreak: true },
    { maintainStreak: false },
  ])("should fetch profile (maintainStreak: $maintainStreak)", async ({ maintainStreak }) => {
    const state = new State()
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {})
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const loggerSpy = vi.spyOn(logger, "log").mockImplementation(() => {})
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {})
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})

    const getConfig = vi.spyOn(state.config, "get")
    getConfig.mockReturnValueOnce("testuid")       // localId
    getConfig.mockReturnValueOnce(maintainStreak)  // maintainStreak

    vi.spyOn(state.config, "createRequestOptions").mockReturnValue({ headers: new Headers(), method: "GET" })
    const getProfileSpy = vi.spyOn(state.monkeytype, "getProfile").mockResolvedValue(profileResponse1 as any)
    const getStreakSpy = vi.spyOn(state.monkeytype, "getStreak").mockResolvedValue(streakClaimed as any)

    // @ts-ignore
    await commandProfile(state)

    expect(getProfileSpy).toHaveBeenCalledTimes(1)
    expect(getStreakSpy).toHaveBeenCalledTimes(maintainStreak ? 1 : 0)
    expect(tableSpy).toHaveBeenCalled()

    tableSpy.mockRestore()
    logSpy.mockRestore()
    loggerSpy.mockRestore()
    successSpy.mockRestore()
    infoSpy.mockRestore()
    getConfig.mockRestore()
    getProfileSpy.mockRestore()
    getStreakSpy.mockRestore()
  })
})

describe("printStreak", () => {
  afterEach(() => { vi.restoreAllMocks() })

  test.each([
    { streakResponse: streakClaimed, expectedMethod: "success", expectedInfo: "Next streak" },
    { streakResponse: streakUnclaimed, expectedMethod: "error", expectedInfo: "Time left" },
  ])("should log streak status correctly ($expectedMethod)", ({ streakResponse, expectedMethod, expectedInfo }) => {
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {})
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {})
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})

    printStreak(streakResponse as any)

    expect(logger[expectedMethod as "success" | "error"]).toHaveBeenCalledTimes(1)
    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(infoSpy.mock.calls[0][0]).toContain(expectedInfo)
  })

  test("should return early when no streak data", () => {
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {})
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {})
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {})

    printStreak({})

    expect(successSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
  })
})

describe("printAllTimeLeaderboards", () => {
  test("should print leaderboard table with rank data", () => {
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {})
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const loggerSpy = vi.spyOn(logger, "log").mockImplementation(() => {})

    printAllTimeLeaderboards(profileResponse1 as any)

    expect(tableSpy).toHaveBeenCalledTimes(1)
    const tableData = tableSpy.mock.calls[0][0] as Array<{ rank: number }>
    expect(tableData[0].rank).toBe(100)

    tableSpy.mockRestore()
    logSpy.mockRestore()
    loggerSpy.mockRestore()
  })
})
