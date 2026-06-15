import type { State } from "../state.js"
import { isTokenValid, createRequestOptions, setConfig } from "../config.js"
import { getResults, ResultsResponse, ResultResponse, refreshToken } from "../monkeytype.js"
import { getTags, TagObject } from "../db/queries/tags.js";
import { createResult, getResultById, getResultsByUserIdAndAfterTimestamp } from "../db/queries/results.js";
import { convertMillisecondsToSimplifiedTime, getStartOfTodayUTC } from "../time.js";

export async function commandResults(state: State, args?: string[]): Promise<void> {
  const allResults = await getAllResults(state)
  if (!allResults) return

  const tags: Array<TagObject> = await getTags(state)
  const tagsObj = {} as Record<string, {count: number; name: string}>
  for (const tag of tags) {
    if (!tagsObj[tag._id]) {
      tagsObj[tag._id] = {
        count: 0,
        name: tag.name,
      }
    }
  }

  const startOfTodayUTC = getStartOfTodayUTC()
  console.log(`\nToday's Results (Since ${new Date(startOfTodayUTC).toLocaleString()}):`)
  printResultsTable(allResults, tagsObj)

  let totalSeconds = 0
  for (const result of allResults) {
    totalSeconds += result.testDuration
    if (result.incompleteTestSeconds) {
      totalSeconds += result.incompleteTestSeconds
    }
  }
  console.log(`Time Spent Typing Today: ${convertMillisecondsToSimplifiedTime(totalSeconds * 1000) || "0 minutes"}`)
}

export function printResultsTable(
  results: ResultResponse[],
  tagsObj: Record<string, {count: number; name: string}>,
) {
  if (!results.length) {
    console.log(`No results to display yet! Take a test to see your results here.\n`)
    return
  }

  const objects = []
  for (let result of results) {
    const tags = result.tags.map((tagId) => tagsObj[tagId].name)
    let object = {
      wpm: result.wpm,
      raw: result.rawWpm,
      accuracy: result.acc,
      consistency: result.consistency,
      chars: `${result.charStats[0]}/${result.charStats[1]}/${result.charStats[2]}/${result.charStats[3]}`,
      mode: `${result.mode} ${result.mode2}`,
      tags: tags.join(','),
      date: new Date(result.timestamp).toLocaleString()
    }
    objects.push(object)
  }

  console.table(objects, Object.keys(objects[0]))
}

export async function getAllResults(state: State): Promise<ResultResponse[] | void>  {
  const startOfTodayUTC = getStartOfTodayUTC()

  // get previous results from config for now
  const onlyToday = await getResultsByUserIdAndAfterTimestamp(state, String(state.config.get("localId")), startOfTodayUTC)
  
  const lastResultTimeStamp = onlyToday.at(-1)?.timestamp || startOfTodayUTC

  let response
  try {
    const requestOptions = createRequestOptions(state.config, "GET")
    response = (await getResults(0, 1000, requestOptions, lastResultTimeStamp)) as ResultsResponse
  } catch (error) {
    if (error instanceof Error) {
      console.error(error?.message)
      return;
    }
  }

  const allResults = [...onlyToday];
  for (const result of response?.data || []) {
    try {
      let exists = await getResultById(state, result._id)
      if (exists) continue
    } catch (error) {
      continue
    }

    const saved = await createResult(state, result._id, result)
    if (saved) {
      allResults.push(result);
    }
  }

  return allResults
}
