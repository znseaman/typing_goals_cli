import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { read } from "read";
import { getAllResults } from "./results.js";
import { emojiForPresetConfigOption, PersonalBests, PresetConfig, ResultResponse } from "../monkeytype.js";
import { bannedPresetOptions } from "./presets.js";
import { getPresetByName, getPresets, PresetObject } from "../db/queries/presets.js";
import { getTags, TagObject } from "../db/queries/tags.js";
import { createGoal, deleteGoalByName, editGoalById, getGoalByName, getGoalsByUserId, GoalWithPresetAndTag } from "../db/queries/goals.js";
import { intervalToDuration, formatDuration, milliseconds } from 'date-fns';

type GoalsObject = Record<string, {
  count: number,
  goal: number,
  name: string,
  goalName: string,
  goalType: string,
  goalTimeFrame: string,
  goalTotalTests: number,
  failedAttempts: number,
  goalTotalTime: number,
  totalSeconds: number,
  pb: number,
  pbTimestamp: number,
  presetConfig: PresetConfig
}>

export const defaultGoalOptions = {
  timeframe: "daily",
  type: "count",
  measure: {
    count: "2",
    time: "5m",
  }
}

const validTimeDurations = new Set(["ms", "s", "m", "h", "millisecond", "milliseconds", "second", "seconds", "minute", "minutes", "hour", "hours"])

export async function commandGoals(state: State, args?: string[]): Promise<void> {
  
  // @ts-ignore
  const [crudType, ...crudArgs] = args

  switch (crudType) {
    case "create":
      await removeReadline_runNonReadline_addReadline(state, () => create(state, crudArgs as string[]))
      break;
    case "edit":
      await removeReadline_runNonReadline_addReadline(state, () => editGoal(state, crudArgs as string[]))
      break;
    case "delete":
      await removeReadline_runNonReadline_addReadline(state, () => deleteGoal(state, crudArgs as string[]))
      break;
    default:
      // @ts-ignore
      const [isVerbose] = args
      const verbose = isVerbose === "-v" ? true : false

      // list current goals
      const goals = await getGoalsByUserId(state, String(state.config.get("localId")))

      if (!goals.length) {
        console.log(`\nNo goals created yet. Type "goals create" to create a goal.\n`)
        return
      }

      // sort names alphabetically
      goals.sort((a: GoalWithPresetAndTag, b: GoalWithPresetAndTag) => a.name.localeCompare(b.name))

      try {
        const allResults = await getAllResults(state)
        const presets: Array<PresetObject> = await getPresets(state)
        const tags: Array<TagObject> = await getTags(state)
        const goalsObj = {} as GoalsObject
        
        for (const goal of goals) {
          let associatedTag = tags.find((tag) => tag._id == goal.tagId as string)
          let associatedPreset = presets.find((preset) => preset._id == goal.presetId)
          if (associatedTag && associatedPreset) {
            const presetConfig = JSON.parse(associatedPreset?.config || "") as PresetConfig
            const tagPersonalBests = JSON.parse(associatedTag?.personalBests || "") as PersonalBests
            let mode: string = presetConfig?.mode || (presetConfig?.words !== 0 ? "words" : (presetConfig?.time !== 0 ? "time" : "unknown mode"))
            let mode2: string = String(presetConfig?.words || presetConfig?.time || "")

            goalsObj[associatedTag._id] = {
              count: 0,
              goal: goal ? goal.measure : 0,
              goalName: goal?.name,
              goalType: goal?.type,
              goalTimeFrame: goal?.timeframe,
              goalTotalTests: goal?.measure,
              goalTotalTime: goal?.measure,
              name: associatedPreset.name,
              // @ts-ignore
              pb: (!mode || !mode2) ? "N/A" : tagPersonalBests?.[mode]?.[mode2]?.[0]?.wpm,
              // @ts-ignore
              pbTimestamp: (!mode || !mode2) ? "N/A" : tagPersonalBests?.[mode]?.[mode2]?.[0]?.timestamp,
              failedAttempts: 0,
              totalSeconds: 0,
              presetConfig: presetConfig || {},
            }
          }
        }

        for (const result of allResults as ResultResponse[]) {
          const tagId = result.tags[0]
          if (goalsObj[tagId]) {
            goalsObj[tagId].count += 1
            goalsObj[tagId].failedAttempts += (result?.restartCount || 0)
            
            // include complete and incomplete tests
            goalsObj[tagId].totalSeconds += result.testDuration
            if (result.incompleteTestSeconds) {
              goalsObj[tagId].totalSeconds += result.incompleteTestSeconds
            }
          }
        }

        printGoalsTable(goals, goalsObj, verbose)
      } catch (error) {
        console.log(`An error occurred in listing goals. Please try again.`)
        console.error((error as Error)?.stack, {code: JSON.stringify(error, null, 2)})
      }
      break;
  }
}

export function printGoals(
  results: ResultResponse[],
  goalsObj: GoalsObject,
) {
  let string = `\nTyping Goals By Name and Preset:\n`

  let totalSeconds = 0

  for (const result of results) {
    const tagId = result.tags[0]
    if (goalsObj[tagId]) {
      goalsObj[tagId].count += 1
    }

    totalSeconds += result.testDuration
    if (result.incompleteTestSeconds) {
      totalSeconds += result.incompleteTestSeconds
    }
  }

  let goalsMet = 0

  for (const [key] of Object.entries(goalsObj)) {
    const metGoal = goalsObj[key].count >= goalsObj[key].goal
    if (metGoal) goalsMet++
    const metGoalIcon = metGoal ? `✅` : `❌`
    const displayHowManyMore = metGoal ? `` : ` (Use preset "${goalsObj[key].name}" to complete ${goalsObj[key].goal - goalsObj[key].count} more)`
    string += `${metGoalIcon} ${goalsObj[key].goalName}${displayHowManyMore}\n`
  }

  let goalsMetPercent = Math.round((goalsMet / Object.keys(goalsObj).length) * 100)
  let goalsMetText = goalsMetPercent == 100 ? '🎉 100% 🎉' : `${goalsMetPercent}%`
  string += `\nPercentage of Goals Met Today: ${goalsMetText}\n`

  string += `\nMore statistics:\n`
  string += `- Time Spent Typing Today: ${Math.round(totalSeconds / 60)} minutes \n`
  string += `\nTo complete the rest of your planned typing goals for today, go to MonkeyType, select your preset associated with your goal (Shift+⌘+P + Presets + PRESET_NAME), and get to typing!\n`

  console.log(string)
}

async function create(state: State, args?: string[]) {
  let [name, type, measure, presetName] = args || ["", "", "", ""]

  // all args provided, no print about following a prompt
  if (!name || !type || !measure || !presetName) {
    console.log(`\nCreate your goal by following the prompt below:\n`)
  }

  const presets: Array<PresetObject> = await getPresets(state)

  if (!name) name = await read({prompt: "Enter daily goal name: "});
  if (!type) type = await read({prompt: "Enter goal type (time, count): ", default: "count"});

  if (type !== "time" && type !== "count") {
    console.log(`There is no goal type, "${type}". Enter in either "time" or "count" as a goal type`)
    return
  }

  if (!measure) measure = type === "time" ? await read({prompt: `Enter total time to complete tests associated with this goal (i.e. 10ms, 10s, 1m, 1h): `, default: defaultGoalOptions.measure.time}) : await read({prompt: `Enter number of tests to complete goal: `, default: defaultGoalOptions.measure.count})
  
  try {
    measure = validateMeasure(measure, type)
  } catch {
    return
  }

  if (!presetName) presetName = await read({prompt: "Enter preset name to connect this goal to: ", completer: createCompleter(presets.map((preset) => preset.name))});

  let tagId
  let presetId
  for (const preset of presets) {
    if (preset.name === presetName) {
      presetId = preset._id
      tagId = preset?.tagId || ""
      break
    }
  }

  if (!presetId) {
    console.log(`There is no preset with the name "${presetName}" associated with this account. Run "presets" command to get your fresh presets from MonkeyType or enter another preset name.`)
    return
  }

  if (!tagId) {
    console.log(`There is no tag associated with preset "${presetName}" on this account. Verify a tag exists on this preset. If a tag exists, please report the data syncing issue.`)
    return
  }

  let existingGoal = await getGoalByName(state, name, String(state.config.get("localId")))
  if (existingGoal) {
    console.log("Goal already exists")
    return
  }

  const goal = await createGoal(state, name, type as "time" | "count", Number(measure), presetId, String(state.config.get("localId")), defaultGoalOptions.timeframe)

  console.log(`\nSuccessfully created a new goal named "${goal.name}"\n`)
}

async function editGoal(state: State, args?: string[]) {
  console.log(`\nEdit your goal by following the prompt below:\n`)

  let [name, type, measure, presetName] = args || ["", "", "", ""]

  const goals = await getGoalsByUserId(state, String(state.config.get("localId")))

  if (!name) name = await read({prompt: "Enter the daily goal name to edit: ", completer: createCompleter(goals.map((goal) => goal.name))});

  let oldGoal = goals.find((goal) => goal.name === name)
  if (!oldGoal) {
    console.log(`There is no goal "${name}" associated with this account. Enter another goal name.`)
    return
  }
  
  const newName = await read({prompt: "Enter the new goal name: ", default: name});

  if (!type) type = await read({prompt: "Enter new goal type (time, count): ", default: oldGoal.type});

  if (type !== "time" && type !== "count") {
    console.log(`There is no goal type, "${type}". Enter in either "time" or "count" as a goal type`)
    return
  }

  // This value should be based on what the old goal's measure was
  if (!measure) measure = type === "time" ? await read({prompt: `Enter new total time to complete tests associated with this goal (i.e. 10ms, 10s, 1m, 1h): `, default: convertMillisecondsToSimplifiedTime(oldGoal.measure)}) : await read({prompt: `Enter new number of tests to complete goal: `, default: String(oldGoal.measure)})

  try {
    measure = validateMeasure(measure, type)
  } catch {
    return
  }

  const presets: Array<PresetObject> = await getPresets(state)
  const oldPresetName = presets.find((preset) => preset._id === oldGoal.presetId)?.name
  if (!presetName) presetName = await read({prompt: "Enter new preset name to connect this goal to: ", default: oldPresetName, completer: await createCompleter(presets.map((preset) => preset.name))});

  const newPreset = await getPresetByName(state, String(state.config.get("localId")), presetName)
  if (!newPreset) {
    console.log(`There is no preset "${presetName}" associated with this user. Enter another preset name.`)
    return
  }

  // only check if the preset names have changed
  if (oldPresetName !== presetName) {
    // does the new preset name already have a goal that it's associated with?
    for (let goal of goals) {
      if (goal.presetId === newPreset.id) {
        console.log(`There is already a goal, ${goal.name}, associated with this tag. Enter another tag name.`)
      }
    }
  }

  const toSet = {
    ...((oldGoal.type !== type || oldGoal.measure !== Number(measure)) && { type: type, measure: Number(measure) }),
    ...(name !== newName && {name: newName}),
    ...(oldPresetName !== presetName && {presetId: newPreset.id})
  } as {name?: string, type?: string, measure?: number, presetId?: string, timeframe?: string};

  // @ts-ignore
  const goal = await editGoalById(state, oldGoal.id, String(state.config.get("localId")), toSet)

  console.log(`\nSuccessfully edited the goal named "${goal.name}"\n`)
}

async function deleteGoal(state: State, args?: string[]) {
  let [name] = args || [""]

  // all args provided, no print about following a prompt
  if (!name) {
    console.log(`\nDelete your goal by following the prompt below:\n`)
  }

  const goals = await getGoalsByUserId(state, String(state.config.get("localId")))

  if (!name) name = await read({prompt: "Enter the daily goal name to delete: ", completer: createCompleter(goals.map((goal) => goal.name))});

  let oldGoal = await getGoalByName(state, name, String(state.config.get("localId")))
  if (!oldGoal) {
    console.log(`There is no goal "${name}" associated with this account. Enter another goal name.`)
  }

  let goal = await deleteGoalByName(state, name, String(state.config.get("localId")))

  console.log(`\nSuccessfully deleted the goal named "${goal.name}"\n`)
}

export function printGoalsTable(
  goals: Array<GoalWithPresetAndTag>,
  goalsObj: GoalsObject,
  verbose?: boolean
) {
  const startOfTodayUTC = Number(new Date(new Date().toISOString().split('T')[0]))
  console.log(`\nToday's Goals (Since ${new Date(startOfTodayUTC).toLocaleString()}):`)

  const objects = []
  for (let goal of goals) {
    const goalObject = goalsObj[goal.tagId as string]
    const presetConfig = goalObject.presetConfig

    let toGo
    let status
    if (goal.type === "count") {
      status = goalObject?.count >= goal.measure
      toGo = status ? 0 : goal.measure - goalObject?.count
    } else if (goal.type === "time") {
      const totalMilliseconds = goalObject?.totalSeconds * 1000
      status = totalMilliseconds >= goal.measure
      toGo = status ? 0 : convertMillisecondsToSimplifiedTime(goal.measure - totalMilliseconds)
      
    } else {
      status = false
      toGo = 0
    }
    
    let object = {}

    if (verbose) {
      let mode = presetConfig?.mode
      let modeNumber = Number(presetConfig?.words || presetConfig?.time || "")
      object = {
        "total time": `${convertMillisecondsToSimplifiedTime((goalObject?.totalSeconds || 0) * 1000) || "0 minutes"}`,
        "total tests": goalObject?.count || 0,
        "❌ failed": goalObject?.failedAttempts || 0,
        "preset name": goalObject?.name,
        "🏆 pb": goalObject?.pb || 'N/A',
        "pb date": goalObject?.pbTimestamp ? new Date(goalObject.pbTimestamp).toLocaleString() : 'N/A',
        [`${emojiForPresetConfigOption["language"]}`]: `${presetConfig?.language}`,
        "mode": `${mode} ${modeNumber}`,
        [`${emojiForPresetConfigOption["minWpmCustomSpeed"]}`]: presetConfig?.minWpmCustomSpeed || 0,
        [`${emojiForPresetConfigOption["minAccCustom"]}`]: presetConfig?.minAccCustom || 0,
        [`${emojiForPresetConfigOption["minBurstCustomSpeed"]}`]: presetConfig?.minBurstCustomSpeed || 0,
        [`${emojiForPresetConfigOption["blindMode"]}`]: presetConfig?.blindMode || false,
        "extra preset options": presetConfig ? Object.entries(presetConfig).reduce((acc, [key, value]) => {
          if (bannedPresetOptions.includes(key)) return acc

          // suppress as they have their own columns now
          if (key === "language" || key === "mode" || key === mode || key === "minWpmCustomSpeed" || key === "minAccCustom" || key === "minBurstCustomSpeed" || key === "blindMode") {
            return acc
          }

          // suppress these options if it's "custom" since it doesn't give any meaningful information about the preset
          if ((key === "minWpm" || key === "minAcc") && (value === "custom" || value === "off")) {
            return acc
          }

          // hide minBurstCustomSpeed and minBurst when minBurst is off
          if ((key === "minBurst" && value === "off") || (key === "minBurstCustomSpeed") && presetConfig?.minBurst === "off") {
            return acc
          }

          // suppress when "words" is 0
          if (key === "words" && value === 0) {
            return acc
          }

          // suppress when "time" is 0
          if (key === "time" && value === 0) {
            return acc
          }

          // suppress when "difficulty" is "normal"
          if (key === "difficulty" && value === "normal") return acc

          // suppress when "oppositeShiftMode" or "confidenceMode" is "off"
          if ((key === "oppositeShiftMode" || key === "confidenceMode") && value === "off") return acc

          const emoji: string = key == "difficulty" ? emojiForPresetConfigOption[key][value as string] || "" : emojiForPresetConfigOption[key] || ""
          const suppressValue = (key == "blindMode" || key == "confidenceMode" || key == "oppositeShiftMode")
          acc.push(`${emoji ? emoji : `${key}:`}${suppressValue ? "" : ` ${value}`}`)
          return acc
        }, [] as string[]).join(`, `) : 'N/A',
      }
    }
    objects.push({
      ...{
        status: status ? `✅` : `❌`,
        name: goal.name,
        type: goal.type,
        "target": goal.type == "time" ? convertMillisecondsToSimplifiedTime(goal.measure) : goal.measure,
        "to go": toGo,
      },
      ...object
    })
  }

  console.table(objects, Object.keys(objects?.[0] || {}))

  let totalSeconds = 0
  for (const [key, _] of Object.entries(goalsObj)) {
    totalSeconds += goalsObj[key].totalSeconds
  }
  console.log(`Time Spent Typing Today: ${convertMillisecondsToSimplifiedTime(totalSeconds * 1000) || "0 minutes"}`)
}

function convertTimeToMilliseconds(number: number, duration: string): string {
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

function validateMeasure(measure: string, type: string): string {
  if (type === "count" && (Number.isNaN(Number(measure)) || !Number.isFinite(Number(measure)))) {
    console.log(`Invalid number of tests entered "${measure}". Enter in a valid number.`)
    throw new Error("Invalid number")
  }

  if (type === "time") {
    const timeRegex = /^(\d+)\s*(\w+)/
    const captureGroups = timeRegex.exec(measure)
    if (!captureGroups) {
      console.log(`Invalid time of "${measure}" entered. Enter in a valid time (i.e. 10ms, 10s, 1m, 1h).`)
      throw new Error("Invalid time")
    }
    
    const number = captureGroups[1]
    const duration = captureGroups[2]
    
    if (!validTimeDurations.has(duration)) {
      console.log(`Invalid time duration of "${duration}" entered. Enter in a valid time duration (i.e. ms, s, m, h).`)
      throw new Error("Invalid time duration")
    }

    if (type === "time" && (Number.isNaN(Number(number)) || !Number.isFinite(Number(number)))) {
      console.log(`Invalid time of tests entered "${measure}". Enter in a valid number.`)
      throw new Error("Invalid number")
    }

    measure = convertTimeToMilliseconds(Number(number), duration)
  }

  return measure
}

function createCompleter(options: string[]): (line: string) => void {
  return (line: string) => {
    const hits = options.filter((option) => option.toLowerCase().startsWith(line.toLowerCase()))

    return [hits.length ? hits : options, line]
  }
}
