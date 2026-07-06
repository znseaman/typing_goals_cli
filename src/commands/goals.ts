import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { read } from "read";
import { getAllResults } from "./results.js";
import { runForceBackfill } from "../goalsSummarizer.js";
import { getFieldsFromConfig, PersonalBests, PresetConfig, ResultResponse } from "../monkeytype.js";
import { PresetObject } from "../db/queries/presets.js";
import { TagObject } from "../db/queries/tags.js";
import { GoalWithPresetAndTag, isGoalMet } from "../db/queries/goals.js";
import { convertMillisecondsToSimplifiedTime, convertTimeToMilliseconds, getStartOfTodayUTC, getTimeUntilTomorrowUTC, validTimeDurations } from "../time.js";
import { boldText, logger } from "../ui/logger.js";
import { stdout } from "node:process";
import { printGoalsStatus } from "./profile.js";
import { createPresetFlow } from "./presets.js";
import { confirm } from "../ui/prompt.js";

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
    count: "1",
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
    case "wizard":
      return await removeReadline_runNonReadline_addReadline(state, `goals ${crudType}`, () => wizard(state))
    case "history":
      // allow for goals with spaces
      return await showGoalHistory(state, crudArgs.join(" "))
    case "backfill":
      logger.info("Re-running goals history backfill. This may take a moment...")
      await runForceBackfill(state)
      return "Goals history backfill complete."
    default:
      const [isVerbose] = args ?? []
      const verbose = isVerbose === "-v" ? true : false

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

      const streaks: Record<string, number> = {}
      for (const goal of goals) {
        streaks[goal.id] = await state.query.computeStreak(state, goal.id)
      }

      await printGoalsTable(goals, goalsObj, streaks, state, verbose)
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

async function promptUntilValid<T>(
  initialValue: string,
  promptFn: (currentValue: string) => string | Promise<string>,
  validate: (input: string) => Promise<T>,
): Promise<T> {
  let value = initialValue
  while (true) {
    value = await promptFn(value)
    try {
      return await validate(value)
    } catch {
      value = ""
    }
  }
}

async function resolvePresetForGoal(
  state: State,
  presets: Array<PresetObject>,
  goals: Array<GoalWithPresetAndTag>,
  options: {
    initialPresetName: string
    promptLabel: string
    defaultPresetName?: string
    allowCreateOnMissing: boolean
    excludeFromDuplicateCheck?: string
  },
): Promise<{ presetId: string; tagId: string; presetName: string }> {
  const availablePresetNames = presets.reduce((acc, preset) => {
    if (preset.goalName) return acc
    acc.push(preset.name)
    return acc
  }, (options.defaultPresetName ? [options.defaultPresetName] : []) as string[])

  let presetName = options.initialPresetName
  while (true) {
    if (!presetName) {
      presetName = await read({
        prompt: boldText(options.promptLabel),
        ...(options.defaultPresetName ? { default: options.defaultPresetName } : {}),
        completer: createCompleter(availablePresetNames),
      })
    }

    let presetId = ""
    let tagId = ""
    for (const preset of presets) {
      if (preset.name === presetName) {
        presetId = preset._id
        tagId = preset?.tagId || ""
        break
      }
    }

    if (!presetId) {
      if (options.allowCreateOnMissing) {
        if (presetName === "") continue
        logger.warn(`Preset "${presetName}" doesn't exist in the database.`)
        if (!(await confirm(`Would you like to create it on MonkeyType? (y/n): `))) { presetName = ""; continue }
        const newPreset = await createPresetFlow(state, presetName)
        if (!newPreset) { presetName = ""; continue }
        return { presetId: newPreset._id, tagId: newPreset.tagId, presetName }
      }
      logger.error(`There is no preset with the name "${presetName}" associated with this account. Run "presets" command to get your fresh presets from MonkeyType or enter another preset name.`)
      presetName = ""
      continue
    }
    if (!tagId) {
      logger.error(`There is no tag associated with preset "${presetName}" on this account. Verify a tag exists on this preset. If a tag exists, please report the data syncing issue.`)
      presetName = ""
      continue
    }

    if (presetName !== options.excludeFromDuplicateCheck) {
      const matchingGoal = goals.find((goal) => goal.presetName === presetName)
      if (matchingGoal) {
        logger.error(`There is already a goal "${matchingGoal.name}" associated with this preset. Enter another preset name.`)
        presetName = ""
        continue
      }
    }

    return { presetId, tagId, presetName }
  }
}

async function create(state: State, args?: string[]): Promise<string | void> {
  let [name, type, measure, presetName] = args || ["", "", "", ""]

  const goals = await state.query.getGoalsByUserId(state)

  const presets: Array<PresetObject> = await state.query.getPresets(state)

  name = await promptUntilValid(
    name,
    (current) => current || read({prompt: boldText("Enter goal name: ")}),
    async (input) => {
      if (input === "") {
        logger.error("Please enter a valid goal name.")
        throw new Error()
      }
      if (await state.query.getGoalByName(state, input)) {
        logger.error("Goal already exists. Please enter another goal name.")
        throw new Error()
      }
      return input
    },
  )

  type = await promptUntilValid(
    type,
    () => read({prompt: boldText(`Enter goal type (time, count): `), default: defaultGoalOptions.type}),
    async (input) => validateType(input),
  )

  measure = await promptUntilValid(
    measure,
    () => type === "time" ?
      read({prompt: boldText(`Enter total time to complete tests associated with this goal (i.e. 10ms, 10s, 1m, 1h): `), default: defaultGoalOptions.measure.time}) :
      read({prompt: boldText(`Enter number of tests to complete goal: `), default: defaultGoalOptions.measure.count}),
    async (input) => validateMeasure(input, type),
  )

  const { presetId } = await resolvePresetForGoal(state, presets, goals, {
    initialPresetName: presetName,
    promptLabel: "Enter preset name to connect this goal to: ",
    allowCreateOnMissing: true,
  })

  const goal = await state.query.createGoal(state, name, type as "time" | "count", Number(measure), presetId, String(state.config.get("localId")), defaultGoalOptions.timeframe)

  return `Successfully created a new goal named "${goal.name}"`
}

async function wizard(state: State): Promise<string> {
  const presets: Array<PresetObject> = await state.query.getPresets(state)

  const candidates = presets
    .filter((preset) => !preset.goalName && preset.tagId)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (candidates.length === 0) {
    logger.info("No presets without an existing goal were found. Nothing to suggest.")
    return "Wizard finished: no new goals were created."
  }

  const createdNames: string[] = []

  for (const preset of candidates) {
    if (!(await confirm(`Preset "${preset.name}" has no goal yet. Create a goal named "${preset.name}" using this preset? (y/n): `, "y"))) {
      continue
    }

    const type = defaultGoalOptions.type
    const measure = type === "time" ? defaultGoalOptions.measure.time : defaultGoalOptions.measure.count

    const result = await create(state, [preset.name, type, measure, preset.name])
    if (result) {
      createdNames.push(preset.name)
    }
  }

  if (createdNames.length === 0) {
    return "Wizard finished: no new goals were created."
  }

  return `Wizard finished: created ${createdNames.length} new goal(s): ${createdNames.join(", ")}.`
}

async function editGoal(state: State, args?: string[]): Promise<string | void> {
  let [name, type, measure, presetName] = args || ["", "", "", ""]

  const goals = await state.query.getGoalsByUserId(state)

  const presets: Array<PresetObject> = await state.query.getPresets(state)

  const existingGoal = await promptUntilValid<GoalWithPresetAndTag>(
    name,
    (current) => current || read({prompt: boldText("Enter goal name to edit: "), completer: createCompleter(goals.map((goal) => goal.name))}),
    async (input) => {
      if (input === "") {
        logger.error("Please enter a valid goal name.")
        throw new Error()
      }
      const found = await state.query.getGoalByName(state, input)
      if (!found) {
        logger.error(`There is no goal "${input}" associated with this account. Enter another goal name.`)
        throw new Error()
      }
      name = input
      return found as GoalWithPresetAndTag
    },
  )

  const newName = await promptUntilValid(
    "",
    () => read({prompt: boldText("Enter the new goal name: "), default: name}),
    async (input) => {
      if (input === "") {
        logger.error("Please enter a new valid goal name.")
        throw new Error()
      }
      if (input !== name) {
        const duplicate = await state.query.getGoalByName(state, input)
        if (duplicate) {
          logger.error(`There is already a goal "${input}" associated with this account. Enter a different new goal name.`)
          throw new Error()
        }
      }
      return input
    },
  )

  type = await promptUntilValid(
    type,
    () => read({prompt: boldText(`Enter new goal type (time, count): `), default: existingGoal.type}),
    async (input) => validateType(input),
  )

  measure = await promptUntilValid(
    measure,
    () => type === "time" ?
      read({prompt: boldText(`Enter total time to complete tests associated with this goal (i.e. 10ms, 10s, 1m, 1h): `), default: existingGoal.type !== type ? defaultGoalOptions.measure.time : convertMillisecondsToSimplifiedTime(existingGoal.measure)}) :
      read({prompt: boldText(`Enter number of tests to complete goal: `), default: existingGoal.type !== type ? defaultGoalOptions.measure.count : String(existingGoal.measure)}),
    async (input) => validateMeasure(input, type),
  )

  const oldPresetName = presets.find((preset) => preset._id === existingGoal.presetId)?.name

  const presetResolution = await resolvePresetForGoal(state, presets, goals, {
    initialPresetName: presetName,
    promptLabel: "Enter new preset name to connect this goal to: ",
    defaultPresetName: oldPresetName,
    allowCreateOnMissing: false,
    excludeFromDuplicateCheck: oldPresetName,
  })
  const presetId = presetResolution.presetId
  presetName = presetResolution.presetName

  const toSet = {
    ...((existingGoal.type !== type || existingGoal.measure !== Number(measure)) && { type: type, measure: Number(measure) }),
    ...(name !== newName && {name: newName}),
    ...(oldPresetName !== presetName && {presetId: presetId})
  } as {name?: string, type?: "time" | "count", measure?: number, presetId?: string, timeframe?: string};

  const goal = await state.query.editGoalById(state, existingGoal.id, String(state.config.get("localId")), toSet)

  return `Successfully edited the goal named "${goal.name}"`
}

async function deleteGoal(state: State, args?: string[]): Promise<string | void> {
  let [...crudArgs] = args || [""]

  const goals = await state.query.getGoalsByUserId(state)

  // allow for goals with spaces
  let name = crudArgs.join(" ")
  name = await promptUntilValid(
    name,
    (current) => current || read({prompt: boldText("Enter goal name to delete: "), completer: createCompleter(goals.map((goal) => goal.name))}),
    async (input) => {
      if (input === "") {
        logger.error("Please enter a valid goal name.")
        throw new Error()
      }
      const existingGoal = await state.query.getGoalByName(state, input)
      if (!existingGoal) {
        logger.error(`There is no goal "${input}" associated with this account. Please enter another goal name.`)
        throw new Error()
      }
      return input
    },
  )

  // Ask to confirm whether they would like to delete the goal
  if (!(await confirm(`Confirm to delete the "${name}" goal (y/n): `))) {
    stdout.write("\x1b[1A\r\x1b[2K")
    return
  }

  let goal = await state.query.deleteGoalByName(state, name, String(state.config.get("localId")))

  return `Successfully deleted the goal named "${goal.name}"`
}

async function showGoalHistory(state: State, goalName?: string): Promise<void> {
  const goals = await state.query.getGoalsByUserId(state)

  if (!goals?.length) {
    logger.error(`No goals created yet. Type "goals create" to create a goal.`)
    return
  }

  const targetGoals = goalName
    ? goals.filter(g => g.name.toLowerCase() === goalName.toLowerCase())
    : goals

  if (goalName && !targetGoals.length) {
    logger.error(`No goal found named "${goalName}".`)
    return
  }

  for (const goal of targetGoals) {
    const history = await state.query.getGoalsHistoryByGoalId(state, goal.id)

    if (!history.length) {
      const startOfTodayUTC = getStartOfTodayUTC()
      const timeLeft = getTimeUntilTomorrowUTC(startOfTodayUTC)
      logger.info(`No history recorded yet for goal "${goal.name}". If the goal was created today, wait ${timeLeft}...`)
      continue
    }

    const streak = await state.query.computeStreak(state, goal.id)
    const daysMet = history.filter(h => h.met).length

    const rows = history.map(h => {
      const totalDisplay = goal.type === "count"
        ? String(h.totalMeasure)
        : convertMillisecondsToSimplifiedTime(h.totalMeasure) || "0 minutes"

      return {
        date: h.date,
        met: h.met ? "✅" : "❌",
        total: totalDisplay,
        target: goal.type === "count"
          ? String(h.measure)
          : convertMillisecondsToSimplifiedTime(h.measure),
        "❌ failed": h.failedTests,
        "avg acc": h.avgAcc != null ? h.avgAcc.toFixed(1) : "—",
        "avg consistency": h.avgConsistency != null ? h.avgConsistency.toFixed(1) : "—",
        "min wpm": h.minWpm != null ? h.minWpm.toFixed(0) : "—",
        "avg wpm": h.avgWpm != null ? h.avgWpm.toFixed(0) : "—",
        "max wpm": h.maxWpm != null ? h.maxWpm.toFixed(0) : "—",
      }
    })

    logger.title(`\nGoal: ${goal.name} — ${daysMet}/${history.length} days met | ${streak === 0 ? `🧊`: `🔥`} ${streak}d streak`)
    logger.table(rows)
  }
}

export async function printGoalsTable(
  goals: Array<GoalWithPresetAndTag>,
  goalsObj: GoalsObject,
  streaks: Record<string, number>,
  state: State,
  verbose?: boolean,
) {
  const startOfTodayUTC = getStartOfTodayUTC()

  const objects = []
  for (let goal of goals) {
    const goalObject = goalsObj[goal.tagId as string]

    const progress = { count: goalObject?.count || 0, totalMs: (goalObject?.totalSeconds || 0) * 1000 }
    const status = isGoalMet(goal, progress)
    const toGo = status ? 0 : goal.type === "count"
      ? goal.measure - progress.count
      : convertMillisecondsToSimplifiedTime(goal.measure - progress.totalMs)


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
    const streak = streaks[goal.id] ?? 0
    objects.push({
      ...{
        status: status ? `✅` : `❌`,
        name: goal.name,
        type: goal.type,
        "target": goal.type == "time" ? convertMillisecondsToSimplifiedTime(goal.measure) : goal.measure,
        "to go": toGo,
        "streak": streak > 0 ? `🔥 ${streak}d` : `🧊 ${streak}d`,
      },
      ...object
    })
  }

  logger.title(`\nToday's Goals 🥅 (Since ${new Date(startOfTodayUTC).toLocaleString()})`)
  logger.table(objects)

  let totalSeconds = 0
  for (const [key, _] of Object.entries(goalsObj)) {
    totalSeconds += goalsObj[key].totalSeconds
  }
  logger.info(`Time Spent Typing Today: ${convertMillisecondsToSimplifiedTime(totalSeconds * 1000) || "0 minutes"}`)
  await printGoalsStatus(state)
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

