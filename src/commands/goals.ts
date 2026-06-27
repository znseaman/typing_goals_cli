import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { read } from "read";
import { getAllResults } from "./results.js";
import { getFieldsFromConfig, PersonalBests, PresetConfig, ResultResponse } from "../monkeytype.js";
import { PresetObject } from "../db/queries/presets.js";
import { TagObject } from "../db/queries/tags.js";
import { GoalWithPresetAndTag } from "../db/queries/goals.js";
import { convertMillisecondsToSimplifiedTime, convertTimeToMilliseconds, getStartOfTodayUTC, validTimeDurations } from "../time.js";
import { boldText, logger } from "../ui/logger.js";

export type GoalsObject = Record<string, {
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
  pb: number | string,
  pbTimestamp: number | string,
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

export async function commandGoals(state: State, args?: string[]): Promise<string | void> {
  
  const [crudType, ...crudArgs] = args ?? []

  switch (crudType) {
    case "create":
      return await removeReadline_runNonReadline_addReadline(state, `goals ${crudType}`, () => create(state, crudArgs as string[]))
    case "edit":
      return await removeReadline_runNonReadline_addReadline(state, `goals ${crudType}`, () => editGoal(state, crudArgs as string[]))
    case "delete":
      return await removeReadline_runNonReadline_addReadline(state, `goals ${crudType}`, () => deleteGoal(state, crudArgs as string[]))
    default:
      const [isVerbose] = args ?? []
      const verbose = isVerbose === "-v" ? true : false

      try {
        // list current goals
        const goals = await state.query.getGoalsByUserId(state)

        if (!goals?.length) {
          logger.error(`No goals created yet. Type "goals create" to create a goal.`)
          return
        }

        const allResults = await getAllResults(state)
        const presets: Array<PresetObject> = await state.query.getPresets(state)
        const tags = await state.query.getTags(state)
        
        if (!tags?.length) {
          logger.error(`No tags for this user in the database. Type "tags" to fetch tags for this user.`)
          return
        }

        if (!presets?.length) {
          logger.error(`No presets for this user in the database. Type "presets" to fetch presets for this user.`)
          return
        }

        const goalsObj = createGoalsObject(goals, tags, presets, (allResults as ResultResponse[]))

        printGoalsTable(goals, goalsObj, verbose)
      } catch (error) {
        logger.error(`An error occurred executing "goals" command: ${(error as Error)?.message}. Please try again.`);
      }
      break;
  }
}

export function createGoalsObject(goals: Array<GoalWithPresetAndTag>, tags: Array<TagObject>, presets: Array<PresetObject>, allResults: ResultResponse[]): GoalsObject {
  const goalsObj = {} as GoalsObject
  for (const goal of goals) {
    let associatedTag = tags?.find((tag) => tag._id == goal.tagId as string)
    let associatedPreset = presets?.find((preset) => preset._id == goal.presetId)
    if (associatedTag && associatedPreset) {
      // workaround for getting json data from database for now
      const presetConfig = JSON.parse(associatedPreset?.config || "") as PresetConfig
      const tagPersonalBests = JSON.parse(associatedTag?.personalBests || "") as PersonalBests
      const { pb } = getFieldsFromConfig(presetConfig, tagPersonalBests);

      goalsObj[associatedTag._id] = {
        count: 0,
        goal: goal ? goal.measure : 0,
        goalName: goal?.name,
        goalType: goal?.type,
        goalTimeFrame: goal?.timeframe,
        goalTotalTests: goal?.measure,
        goalTotalTime: goal?.measure,
        name: associatedPreset.name,
        pb: pb?.wpm ?? "❌",
        pbTimestamp: pb?.timestamp ?? "❌",
        failedAttempts: 0,
        totalSeconds: 0,
        presetConfig: presetConfig || {},
      }
    }
  }

  for (const result of allResults) {
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

  return goalsObj;
}

async function create(state: State, args?: string[]): Promise<string | void> {
  let [name, type, measure, presetName] = args || ["", "", "", ""]

  const goals = await state.query.getGoalsByUserId(state)

  const presets: Array<PresetObject> = await state.query.getPresets(state)

  let validatedName = false
  while (!name || !validatedName) {
    if (!name) name = await read({prompt: boldText("Enter goal name: ")});
    if (name === "") {
      logger.error("Please enter a valid goal name.")
      continue
    }
    
    let existingGoal = await state.query.getGoalByName(state, name)
    if (existingGoal) {
      logger.error("Goal already exists. Please enter another goal name.")
      name = ""
      continue
    }

    validatedName = true
  }

  let editing = false
  let def = defaultGoalOptions.type
  let validatedType = false
  while (!type || !validatedType) {
    if (!type) type = await read({prompt: boldText(`Enter${editing ? " new " : " "}goal type (time, count): `), default: def});

    try {
      type = validateType(type)
    } catch {
      type = ""
      continue
    }

    validatedType = true
  }

  let validatedMeasure = false
  while (!measure || !validatedMeasure) {
    measure = type === "time" ? 
      await read({prompt: boldText(`Enter total time to complete tests associated with this goal (i.e. 10ms, 10s, 1m, 1h): `), default: defaultGoalOptions.measure.time}) :
      await read({prompt: boldText(`Enter number of tests to complete goal: `), default: defaultGoalOptions.measure.count})

    try {
      measure = validateMeasure(measure, type)
    } catch {
      measure = ""
      continue
    }

    validatedMeasure = true
  }

  let tagId = ""
  let presetId = ""
  let validatedPresetName = false
  let availablePresetNames = presets.reduce((acc, preset) => {
    if (preset.goalName) return acc
    acc.push(preset.name)
    return acc
  }, [] as string[])

  while (!presetName || !validatedPresetName) {
    if (!presetName) {
      presetName = await read({prompt: boldText("Enter preset name to connect this goal to: "), completer: createCompleter(availablePresetNames)});
    }

    for (const preset of presets) {
      if (preset.name === presetName) {
        presetId = preset._id
        tagId = preset?.tagId || ""
        break
      }
    }

    if (!presetId) {
      logger.error(`There is no preset with the name "${presetName}" associated with this account. Run "presets" command to get your fresh presets from MonkeyType or enter another preset name.`)
      presetName = ""
      continue
    }
    if (!tagId) {
      logger.error(`There is no tag associated with preset "${presetName}" on this account. Verify a tag exists on this preset. If a tag exists, please report the data syncing issue.`)
      presetName = ""
      continue
    }

    // does the new preset name already have a goal that it's associated with?
    let matchingGoal = goals.find((goal) => goal.presetName === presetName)
    if (matchingGoal) {
      logger.error(`There is already a goal "${matchingGoal.name}" associated with this preset. Enter another preset name.`)
      presetName = ""
      continue
    }

    validatedPresetName = true
  }

  const goal = await state.query.createGoal(state, name, type as "time" | "count", Number(measure), presetId, String(state.config.get("localId")), defaultGoalOptions.timeframe)

  return `Successfully created a new goal named "${goal.name}"`
}

async function editGoal(state: State, args?: string[]): Promise<string | void> {
  let [name, type, measure, presetName] = args || ["", "", "", ""]

  const goals = await state.query.getGoalsByUserId(state)

  const presets: Array<PresetObject> = await state.query.getPresets(state)

  let existingGoal: GoalWithPresetAndTag | boolean = false
  while (!existingGoal) {
    if (!name) name = await read({prompt: boldText("Enter goal name to edit: "), completer: createCompleter(goals.map((goal) => goal.name))});
    if (name === "") {
      logger.error("Please enter a valid goal name.")
      continue
    }

    existingGoal = await state.query.getGoalByName(state, name)
    if (!existingGoal) {
      logger.error(`There is no goal "${name}" associated with this account. Enter another goal name.`)
      name = ""
      continue
    }
  }
  
  let newName = ""
  let noExistingGoal: GoalWithPresetAndTag | boolean = true
  while (noExistingGoal) {
    newName = await read({prompt: boldText("Enter the new goal name: "), default: name});
    if (newName === "") {
      logger.error("Please enter a new valid goal name.")
      continue
    }

    if (newName !== name) {
      noExistingGoal = await state.query.getGoalByName(state, newName)
      if (noExistingGoal) {
        logger.error(`There is already a goal "${newName}" associated with this account. Enter a different new goal name.`)
        newName = ""
        continue
      }
    }

    noExistingGoal = false
  }

  let editing = true
  let def = (existingGoal as GoalWithPresetAndTag).type
  let validatedType = false
  while (!type || !validatedType) {
    type = await read({prompt: boldText(`Enter${editing ? " new " : " "}goal type (time, count): `), default: def});
    if (type !== "time" && type !== "count") {
      logger.error(`There is no goal type, "${type}". Enter in either "time" or "count" as a goal type`)
      type = ""
      continue
    }

    validatedType = true
  }

  let validatedMeasure = false
  while (!measure || !validatedMeasure) {
    measure = type === "time" ? 
      await read({prompt: boldText(`Enter total time to complete tests associated with this goal (i.e. 10ms, 10s, 1m, 1h): `), default: (existingGoal as GoalWithPresetAndTag).type !== type ? defaultGoalOptions.measure.time : convertMillisecondsToSimplifiedTime((existingGoal as GoalWithPresetAndTag).measure)}) :
      await read({prompt: boldText(`Enter number of tests to complete goal: `), default: (existingGoal as GoalWithPresetAndTag).type !== type ? defaultGoalOptions.measure.count : String((existingGoal as GoalWithPresetAndTag).measure)})

    try {
      measure = validateMeasure(measure, type)
    } catch {
      measure = ""
      continue
    }

    validatedMeasure = true
  }

  const oldPresetName = presets.find((preset) => preset._id === (existingGoal as GoalWithPresetAndTag).presetId)?.name

  let tagId = ""
  let presetId = ""
  let validatedPresetName = false
  // let the old preset name be allowed to be available
  let availablePresetNames = presets.reduce((acc, preset) => {
    if (preset.goalName) return acc
    acc.push(preset.name)
    return acc
  }, [ oldPresetName ] as string[])

  while (!presetName || !validatedPresetName) {
    if (!presetName) presetName = await read({prompt: boldText("Enter new preset name to connect this goal to: "), default: (oldPresetName as string), completer: createCompleter(availablePresetNames)});

    // only check if the preset names have changed
    if (oldPresetName !== presetName) {
      // does the new preset name already have a goal that it's associated with?
      let matchingGoal = goals.find((goal) => goal.presetName === presetName)
      if (matchingGoal) {
        logger.error(`There is already a goal "${matchingGoal.name}" associated with this preset. Enter another preset name.`)
        presetName = ""
        continue
      }
    }

    for (const preset of presets) {
      if (preset.name === presetName) {
        presetId = preset._id
        tagId = preset?.tagId || ""
        break
      }
    }

    if (!presetId) {
      logger.error(`There is no preset with the name "${presetName}" associated with this account. Run "presets" command to get your fresh presets from MonkeyType or enter another preset name.`)
      presetName = ""
      continue
    }
    if (!tagId) {
      logger.error(`There is no tag associated with preset "${presetName}" on this account. Verify a tag exists on this preset. If a tag exists, please report the data syncing issue.`)
      presetName = ""
      continue
    }

    validatedPresetName = true
  }

  const toSet = {
    ...(((existingGoal as GoalWithPresetAndTag).type !== type || (existingGoal as GoalWithPresetAndTag).measure !== Number(measure)) && { type: type, measure: Number(measure) }),
    ...(name !== newName && {name: newName}),
    ...(oldPresetName !== presetName && {presetId: presetId})
  } as {name?: string, type?: "time" | "count", measure?: number, presetId?: string, timeframe?: string};

  const goal = await state.query.editGoalById(state, (existingGoal as GoalWithPresetAndTag).id, String(state.config.get("localId")), toSet)

  return `Successfully edited the goal named "${goal.name}"`
}

async function deleteGoal(state: State, args?: string[]): Promise<string | void> {
  let [name] = args || [""]

  const goals = await state.query.getGoalsByUserId(state)

  let validatedName = false
  while (!name || !validatedName) {
    if (!name) name = await read({prompt: boldText("Enter goal name to delete: "), completer: createCompleter(goals.map((goal) => goal.name))});
    if (name === "") {
      logger.error("Please enter a valid goal name.")
      continue
    }

    let existingGoal = await state.query.getGoalByName(state, name)
    if (!existingGoal) {
      logger.error(`There is no goal "${name}" associated with this account. Please enter another goal name.`)
      name = ""
      continue
    }

    validatedName = true
  }

  let goal = await state.query.deleteGoalByName(state, name, String(state.config.get("localId")))

  return `Successfully deleted the goal named "${goal.name}"`
}

export function printGoalsTable(
  goals: Array<GoalWithPresetAndTag>,
  goalsObj: GoalsObject,
  verbose?: boolean
) {
  const startOfTodayUTC = getStartOfTodayUTC()
  logger.log(`\nToday's Goals 🥅 (Since ${new Date(startOfTodayUTC).toLocaleString()}):`)

  const objects = []
  for (let goal of goals) {
    const goalObject = goalsObj[goal.tagId as string]

    let toGo
    let status
    if (goal.type === "count") {
      status = goalObject?.count >= goal.measure
      toGo = status ? 0 : goal.measure - (goalObject?.count || 0)
    } else {
      const totalMilliseconds = (goalObject?.totalSeconds || 0) * 1000
      status = totalMilliseconds >= goal.measure
      toGo = status ? 0 : convertMillisecondsToSimplifiedTime(goal.measure - totalMilliseconds)
    }
    
    let object = {}

    if (verbose) {
      object = {
        "total time": `${convertMillisecondsToSimplifiedTime((goalObject?.totalSeconds || 0) * 1000) || "0 minutes"}`,
        "total tests": goalObject?.count || 0,
        "❌ failed": goalObject?.failedAttempts || 0,
        "🏆 pb": goalObject?.pb || 'N/A',
        "pb date": goalObject?.pbTimestamp ? new Date(goalObject.pbTimestamp).toLocaleString() : 'N/A',
        "associated preset": goalObject?.name,
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
  logger.info(`Time Spent Typing Today: ${convertMillisecondsToSimplifiedTime(totalSeconds * 1000) || "0 minutes"}`)
}

export function validateMeasure(measure: string, type: string): string {
  if (type === "count" && (Number.isNaN(Number(measure)) || !Number.isFinite(Number(measure)) || Number(measure) === 0)) {
    logger.error(`Invalid number of tests entered "${measure}". Enter in a valid number greater than 0.`)
    throw new Error("Invalid number")
  }
  

  if (type === "time") {
    const timeRegex = /^(\d+)\s*(\w+)/
    const captureGroups = timeRegex.exec(measure)
    if (!captureGroups) {
      logger.error(`Invalid time of "${measure}" entered. Enter in a valid time (i.e. 10ms, 10s, 1m, 1h).`)
      throw new Error("Invalid time")
    }
    
    const number = captureGroups[1]
    const duration = captureGroups[2]

    if (!validTimeDurations.has(duration)) {
      logger.error(`Invalid time duration of "${duration}" entered. Enter in a valid time duration (i.e. ms, s, m, h).`)
      throw new Error("Invalid time duration")
    }

    if (type === "time" && (Number.isNaN(Number(number)) || Number(number) === 0)) {
      logger.error(`Invalid time of tests entered "${measure}". Enter in a valid number.`)
      throw new Error("Invalid number")
    }

    measure = convertTimeToMilliseconds(Number(number), duration)
  }

  return measure
}

export function createCompleter(options: string[]): (line: string) => void {
  return (line: string) => {
    const hits = options.filter((option) => option.toLowerCase().startsWith(line.toLowerCase()))

    return [hits.length ? hits : options, line]
  }
}

export function validateType(type: string) {
  if (type !== "time" && type !== "count") {
    logger.error(`There is no goal type, "${type}". Enter in either "time" or "count" as a goal type`)
    throw new Error("Invalid goal type")
  }

  return type
}

