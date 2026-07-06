import { intervalToDuration, formatDuration as formatDurationFns, milliseconds, isAfter, type Duration } from 'date-fns';

export const validTimeDurations = new Set(["ms", "s", "m", "h", "millisecond", "milliseconds", "second", "seconds", "minute", "minutes", "hour", "hours"])

export function getStartOfTodayUTC() {
  return Number(new Date(new Date().toISOString().split("T")[0]))
}

export function getStartOfTomorrowUTC(startOfTodayUTC: number, offsetMs = 0): number {
  return startOfTodayUTC + offsetMs + Number(convertTimeToMilliseconds(24, "h"))
}

export function getTimeUntilTomorrowUTC(startOfTodayUTC: number, offsetMs = 0) {
  const startOfTomorrow = getStartOfTomorrowUTC(startOfTodayUTC, offsetMs)
  return intervalToDuration({ start: new Date(), end: startOfTomorrow })
}

export function isStreakClaimedToday(lastResultTimestamp: number, startOfTodayUTC: number, offsetMs: number): boolean {
  return isAfter(lastResultTimestamp + offsetMs, startOfTodayUTC + offsetMs)
}

export function convertTimeToMilliseconds(number: number, duration: string): string {
  switch (duration) {
    case "ms":
    case "millisecond":
    case "milliseconds":
      return String(number)
    case "s":
    case "second":
    case "seconds":
      return String(milliseconds({seconds: number}))
    case "m":
    case "minute":
    case "minutes":
      return String(milliseconds({minutes: number}))
    case "h":
    case "hour":
    case "hours":
      return String(milliseconds({hours: number}))
    default:
      return String(0)
  }
}

export function convertMillisecondsToSimplifiedTime(number: number): string {
  const duration = intervalToDuration({ start: 0, end: number });

  const readableDuration = formatDurationFns(duration);

  return readableDuration
}

export function formatDuration(duration: Duration): string {
  return formatDurationFns(duration)
}
