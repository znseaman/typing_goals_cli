import { type State } from "../state.js"
import { ProfileResponse, StreakResponse } from "../monkeytype.js"
import { logger } from "../ui/logger.js"
import { convertMillisecondsToSimplifiedTime, convertTimeToMilliseconds, getStartOfTodayUTC } from "../time.js"
import { formatDuration, intervalToDuration, isAfter } from "date-fns"

export async function commandProfile(state: State, args?: string[]): Promise<string | void> {
  const requestOptions = state.config.createRequestOptions("GET")
  const userId = String(state.config.get("localId"))
  const profileResponse = await state.monkeytype.getProfile(userId, requestOptions)
  const streakResponse = state.config.get("maintainStreak") ? await state.monkeytype.getStreak(requestOptions) : {}

  printProfile(profileResponse, streakResponse)
}

export function printStreak(streakResponse: StreakResponse | {}) {
  if (!("data" in streakResponse)) return
  let lastResultTimestamp = streakResponse?.data?.lastResultTimestamp ?? 0
  let startOfTodayUTC = getStartOfTodayUTC()
  const hourOffset = streakResponse?.data?.hourOffset || 0
  const offsetMs = Number(convertTimeToMilliseconds(hourOffset, "h"))
  let streakClaimedToday = isAfter(lastResultTimestamp + offsetMs, startOfTodayUTC + offsetMs)

  logger[streakClaimedToday ? "success" : "error"](`${streakClaimedToday ? "S" : "No s"}treak claimed today!`)
  const startOfTomorrow = startOfTodayUTC + offsetMs + Number(convertTimeToMilliseconds(24, "h"))
  if (!streakClaimedToday) {
    const timeLeft = intervalToDuration({ start: new Date(), end: startOfTomorrow })
    logger.info(`Time left to claim streak ⏳: ${formatDuration(timeLeft)}...`)
  } else {
    const timeUntilNext = intervalToDuration({ start: new Date(), end: startOfTomorrow })
    logger.info(`Next streak available in ${formatDuration(timeUntilNext)}... ⏲️`)
  }
}

export async function printProfile(profileResponse: ProfileResponse, streakResponse: StreakResponse | {}) {
  const {name, addedAt, streak, maxStreak, xp, typingStats, personalBests, details, allTimeLbs} = profileResponse.data

  const pfd = [{
    name: name,
    joined: `${new Date(addedAt).toLocaleString()}`,
    "current streak": `${streak} days`,
    "max streak": `${maxStreak} days`,
    xp: xp,
    bio: details.bio,
    keyboard: details.keyboard,
  }]
  logger.log(`\nYour MonkeyType Profile:`)
  console.table(pfd, Object.keys(pfd?.[0] || {}))

  printStreak(streakResponse)

  const stats = [{
    "tests started": typingStats.startedTests,
    "tests completed": typingStats.completedTests,
    "time typing": `${convertMillisecondsToSimplifiedTime(Number(typingStats.timeTyping) * 1000)}`,
  }]
  logger.log(`\nTyping Stats:`)
  console.table(stats, Object.keys(stats?.[0] || {}))

  printAllTimeLeaderboards(profileResponse)

  // Display time personal bests
  const pbs = []
  const time = "time"
  for (const key of Object.keys(personalBests[time])) {
    //@ts-ignore
    let obj = personalBests?.[time]?.[key][0]
    pbs.push({
      type: `${time}`,
      name: `${key} seconds`,
      wpm: obj.wpm,
      accuracy: obj.acc,
      timestamp: new Date(obj.timestamp).toLocaleString(),
    })
  }

  const words = "words"
  for (const key of Object.keys(personalBests[words])) {
    //@ts-ignore
    let obj = personalBests?.[words]?.[key][0]
    pbs.push({
      type: `${words}`,
      name: `${key} seconds`,
      wpm: obj.wpm,
      accuracy: obj.acc,
      timestamp: new Date(obj.timestamp).toLocaleString(),
    })
  }
  
  logger.log(`\nYour PBs 🏆:`)
  console.table(pbs, Object.keys(pbs?.[0] || {}))
}

export async function printAllTimeLeaderboards(profileResponse: ProfileResponse){
  const allTimeLbs = profileResponse.data.allTimeLbs
  const atlbs = []
  for (const mode of Object.keys(allTimeLbs)) {
    // @ts-ignore
    for (const mode2 of Object.keys(allTimeLbs[mode])) {
      // @ts-ignore
      for (const language of Object.keys(allTimeLbs[mode][mode2])) {
        // @ts-ignore
        const {rank} = allTimeLbs[mode][mode2][language]
        atlbs.push({
          name: convertMillisecondsToSimplifiedTime(Number(mode2) * 1000),
          rank,
        })
      }
    }
  }

  logger.log(`\nYour All-Time English Leaderboards 👑:`)
  console.table(atlbs, Object.keys(atlbs?.[0] || {}))
}