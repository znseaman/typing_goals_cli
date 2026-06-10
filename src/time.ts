import { intervalToDuration, formatDuration, milliseconds } from 'date-fns';

export const validTimeDurations = new Set(["ms", "s", "m", "h", "millisecond", "milliseconds", "second", "seconds", "minute", "minutes", "hour", "hours"])

export function getStartOfTodayUTC() {
  return Number(new Date(new Date().toISOString().split("T")[0]))
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

  const readableDuration = formatDuration(duration);

  return readableDuration
}
