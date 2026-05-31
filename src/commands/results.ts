import type { State } from "../state.js"
import { isTokenValid, createRequestOptions, setConfig } from "../config.js"
import { getResults, ResultsResponse, ResultResponse, refreshToken } from "../monkeytype.js"

export async function commandResults(state: State, args?: string[]): Promise<void> {
  // Bypass if under expires in
  if (!isTokenValid(state.config)) {
    // Try to refresh their token using refresh token
    const token = String(state.config.get('refreshToken') || "")
    if (!token) {
      console.log(`\nType 'login' to reconnect.\n`);
      return
    }

    try {
      const response = await refreshToken(token)
      
      const data = {
        "idToken": response.id_token,
        "expiresIn": response.expires_in,
        "refreshToken": response.refresh_token,
      }

      setConfig(data, state.config)
    } catch {
      console.log(`\nType 'login' to reconnect.\n`);
      return
    }
  }

  const startOfTodayUTC = Number(new Date(new Date().toISOString().split('T')[0]))

  // get previous results from config for now
  const previousResults = state.config.get("results") as ResultResponse[] || []
  const onlyToday = previousResults.filter((result) => Number(result.timestamp) >= startOfTodayUTC)
  
  const lastResultTimeStamp = previousResults.at(-1)?.timestamp || startOfTodayUTC

  let response
  try {
    const requestOptions = createRequestOptions(state.config, 'GET')
    response = (await getResults(0, 1000, requestOptions, lastResultTimeStamp)) as ResultsResponse
  } catch (error) {
    if (error instanceof Error) {
      console.error(error?.message, {code: JSON.stringify(error), exit: 1})
    }
  }

  const allResults = [...onlyToday, ...(response?.data || [])]

  setConfig({"results": allResults}, state.config)

  // get all the tags for this user
  const tags = state.config.get("tags") as Array<Record<string, any>> || []
  const tagsObj = {} as Record<string, {count: number; goal: number; name: string}>
  for (const tag of tags) {
    if (!tagsObj[tag._id]) {
      tagsObj[tag._id] = {
        count: 0,
        goal: 2,
        name: tag.name,
      }
    }
  }

  console.log(`\nToday's Results (Since ${new Date(startOfTodayUTC).toLocaleString()}):`)
  printResultsTable(allResults, tagsObj)

  let totalSeconds = 0
  for (const result of allResults) {
    totalSeconds += result.testDuration
    if (result.incompleteTestSeconds) {
      totalSeconds += result.incompleteTestSeconds
    }
  }
  console.log(`Time Spent Typing Today:${Math.round(totalSeconds / 60)} minutes`)
}

export function printResultsTable(
  results: ResultResponse[],
  tagsObj: Record<string, {count: number; goal: number; name: string}>,
) {

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
  // Bypass if under expires in
  if (!isTokenValid(state.config)) {
    // Try to refresh their token using refresh token
    const token = String(state.config.get("refreshToken") || "")
    if (!token) {
      console.log(`\nType "login" to reconnect.\n`);
      return
    }

    try {
      const response = await refreshToken(token)
      
      const data = {
        "idToken": response.id_token,
        "expiresIn": response.expires_in,
        "refreshToken": response.refresh_token,
      }

      setConfig(data, state.config)
    } catch {
      console.log(`\nType "login" to reconnect.\n`);
      return
    }
  }

  const startOfTodayUTC = Number(new Date(new Date().toISOString().split("T")[0]))

  // get previous results from config for now
  const previousResults = state.config.get("results") as ResultResponse[] || []
  const onlyToday = previousResults.filter((result) => Number(result.timestamp) >= startOfTodayUTC)
  
  const lastResultTimeStamp = previousResults.at(-1)?.timestamp || startOfTodayUTC

  let response
  try {
    const requestOptions = createRequestOptions(state.config, "GET")
    response = (await getResults(0, 1000, requestOptions, lastResultTimeStamp)) as ResultsResponse
  } catch (error) {
    if (error instanceof Error) {
      console.error(error?.message, {code: JSON.stringify(error), exit: 1})
    }
  }

  const allResults = [...onlyToday, ...(response?.data || [])]

  setConfig({"results": allResults}, state.config)

  return allResults
}
