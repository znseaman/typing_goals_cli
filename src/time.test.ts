import { describe, expect, vi, beforeEach, afterEach, test } from "vitest";
import { getStartOfTodayUTC, convertTimeToMilliseconds, convertMillisecondsToSimplifiedTime } from "./time.js";

describe("time functions", () => {

  beforeEach(() => {
  });

  afterEach(() => {
    
  });

  test.each([
    { number: 1, duration: "ms", expected: "1" },
    { number: 1, duration: "s", expected: "1000" },
    { number: 1, duration: "m", expected: "60000" },
    { number: 1, duration: "h", expected: "3600000" },
    { number: 1, duration: "lol", expected: "0" },
  ])
  ("convertTimeToMilliseconds($number, $duration) -> $expected", ({ number, duration, expected}) => {
    const result = convertTimeToMilliseconds(number, duration);

    expect(result).toBe(expected);
  });

  test.each([
    { date: new Date(2012, 1, 1, 13), expected: 1328054400000 },
  ])
  ("getStartOfTodayUTC() -> $expected", ({ date, expected}) => {
    vi.setSystemTime(date);

    const result = getStartOfTodayUTC();

    expect(result).toBe(expected);
  });

  test.each([
    { number: 30000, expected: "30 seconds" },
  ])
  ("convertMillisecondsToSimplifiedTime($number) -> $expected", ({ number, expected}) => {

    const result = convertMillisecondsToSimplifiedTime(number);

    expect(result).toBe(expected);
  });
});

