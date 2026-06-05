import { removeReadline_runNonReadline_addReadline, type State } from "../state.js";
import { read } from "read";
import { getAllResults } from "./results.js";
import { emojiForPresetConfigOption, PresetResponse, ResultResponse } from "../monkeytype.js";
import { bannedPresetOptions } from "./presets.js";
import { getPresetsByUserId, Preset } from "../db/queries/presets.js";
import { getTagsByUserId, Tag } from "../db/queries/tags.js";
import { createGoal, deleteGoalByName, editGoalById, getGoalByName, getGoalsByUserId, GoalWithPresetAndTag } from "../db/queries/goals.js";

type GoalsObject = Record<string, {
  count: number;
  goal: number;
  name: string,
  goalName: string,
  goalTimeFrame: string,
  goalTotalTests: number,
  failedAttempts: number,
  pb: number,
  pbTimestamp: number,
  presetOptions: Record<string, any>
}>

export async function commandGoals(state: State, args?: string[]): Promise<void> {
  
  // @ts-ignore
  const [crudType] = args

  switch (crudType) {
    case "create":
      await removeReadline_runNonReadline_addReadline(state, () => create(state))
      break;
    case "edit":
      await removeReadline_runNonReadline_addReadline(state, () => editGoal(state))
      break;
    case "delete":
      await removeReadline_runNonReadline_addReadline(state, () => deleteGoal(state))
      break;
    default:
      const [isVerbose] = args
      const verbose = isVerbose === "-v" ? true : false

      // list current goals
      const goals = await getGoalsByUserId(state, String(state.config.get("localId")))

      // sort names alphabetically
      goals.sort((a: GoalWithPresetAndTag, b: GoalWithPresetAndTag) => a.name.localeCompare(b.name))

      try {
        const allResults = await getAllResults(state)
        const rawPresets: Array<Preset> = await getPresetsByUserId(state, String(state.config.get("localId")))
        // @ts-ignore
        const presets: Array<PresetResponse> = rawPresets.map((rawPreset) => rawPreset?.fullDetails)

        const rawTags: Array<Tag> = await getTagsByUserId(state, String(state.config.get("localId")))
        // @ts-ignore
        const tags: Array<TagResponseResponse> = rawTags.map((rawTag) => rawTag?.fullDetails)
        const goalsObj = {} as GoalsObject
        
        for (const goal of goals) {
          let associatedTag = tags.find((tag) => tag._id == goal.tagId as string)
          let associatedPreset = presets.find((preset) => preset._id == goal.presetId)
          if (associatedTag && associatedPreset) {
            let mode: string = associatedPreset?.config?.mode || (associatedPreset?.config?.words !== 0 ? "words" : (associatedPreset?.config?.time !== 0 ? "time" : "unknown mode"))
            let mode2: string = String(associatedPreset?.config?.words || associatedPreset?.config?.time || "")

            let pb = (!mode || !mode2) ? "N/A" : associatedTag.personalBests[mode][mode2][0].wpm
            let pbTimestamp = (!mode || !mode2) ? "N/A" : associatedTag.personalBests[mode][mode2][0].timestamp

            goalsObj[associatedTag._id] = {
              count: 0,
              goal: goal ? goal.totalTests : 0,
              goalName: goal?.name,
              goalTimeFrame: goal?.timeframe,
              goalTotalTests: goal?.totalTests,
              name: associatedTag.name,
              pb: pb,
              pbTimestamp: pbTimestamp,
              failedAttempts: 0,
              presetOptions: associatedPreset || {},
            }
          }
        }

        for (const result of allResults as ResultResponse[]) {
          const tagId = result.tags[0]
          if (goalsObj[tagId]) {
            goalsObj[tagId].count += 1
            goalsObj[tagId].failedAttempts += (result?.restartCount || 0)
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

async function create(state: State) {
  console.log(`Create your goal by following the prompt below:`)

  const name = await read({prompt: "Enter daily goal name: "});
  const timeframe = await read({prompt: "Enter goal time frame (only daily): ", default: "daily", edit: false});
  const tagName = await read({prompt: "Enter tag name to connect this goal to: "});
  const totalTests = await read({prompt: "Enter number of tests to meet goal: "});

  const rawTags: Array<Tag> = await getTagsByUserId(state, String(state.config.get("localId")))
  // @ts-ignore
  const tags: Array<TagResponseResponse> = rawTags.map((rawTag) => rawTag?.fullDetails)

  let tagId
  for (const tag of tags) {
    if (tag.name === tagName) {
      tagId = tag._id
    }
  }

  if (!tagId) {
    console.log(`There is no tag name, "${tagName}" associated with this account. Enter another tag name.`)
    return
  }

  const rawPresets: Array<Preset> = await getPresetsByUserId(state, String(state.config.get("localId")))
  // @ts-ignore
  const presets: Array<PresetResponse> = rawPresets.map((rawPreset) => rawPreset?.fullDetails)

  let presetId
  for (const preset of presets) {
    if (preset?.config?.tags?.includes(tagId)) {
      presetId = preset._id
    }
  }

  if (!presetId) {
    console.log(`There is no preset that contains the tag "${tagName}" (_id: ${tagId}) associated with this account. Check your MonkeyType presets to verify the tag has been saved to a preset.`)
    return
  }

  if (Number.isNaN(Number(totalTests))) {
    console.log(`Invalid number of tests entered (${totalTests}). Enter in a number.`)
    return
  }

  let existingGoal = await getGoalByName(state, name, String(state.config.get("localId")))
  if (existingGoal) {
    console.log("Goal already exists")
    return
  }

  const goal = await createGoal(state, name, tagId, presetId, String(state.config.get("localId")), timeframe, Number(totalTests))

  console.log(`\nSuccessfully created a new goal named "${goal.name}"`)
}

async function editGoal(state: State) {
  console.log(`Edit your goal by following the prompt below:`)

  const name = await read({prompt: "Enter the daily goal name to edit: "});
  const totalTests = await read({prompt: "Enter new number of tests to meet goal: "});
  
  let oldGoal = await getGoalByName(state, name, String(state.config.get("localId")))
  if (!oldGoal) {
    console.log(`There is no goal "${name}" associated with this account. Enter another goal name.`)
  }

  if (Number.isNaN(Number(totalTests))) {
    console.log(`Invalid number of tests entered (${totalTests}). Enter in a number.`)
    return
  }

  const toSet = {
    ...(totalTests && { totalTests: totalTests }),
  } as {name?: string, tagId?: string, presetId?: string, timeframe?: string, totalTests?: number};

  // @ts-ignore
  const goal = await editGoalById(state, oldGoal.id, String(state.config.get("localId")), toSet)

  console.log(`\nSuccessfully edited the goal named "${goal.name}"`)
}

async function deleteGoal(state: State) {
  console.log(`Delete your goal by following the prompt below:`)

  const name = await read({prompt: "Enter the daily goal name to delete: "});

  let oldGoal = await getGoalByName(state, name, String(state.config.get("localId")))
  if (!oldGoal) {
    console.log(`There is no goal "${name}" associated with this account. Enter another goal name.`)
  }

  let goal = await deleteGoalByName(state, name, String(state.config.get("localId")))

  console.log(`\nSuccessfully deleted the goal named "${goal.name}"`)
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
    let object = {}
    if (verbose) {
      let mode = goalsObj[goal.tagId as string]?.presetOptions?.config?.mode
      let modeNumber = goalsObj[goal.tagId as string]?.presetOptions?.config[mode]
      object = {
        "status": goalsObj[goal.tagId as string]?.count >= goal.totalTests ? `✅` : `❌`,
        name: goal.name,
        "how many more?": goal.totalTests - goalsObj[goal.tagId as string]?.count > 0 ? goal.totalTests - goalsObj[goal.tagId as string]?.count : 0,
        "❌ failed": goalsObj[goal.tagId as string]?.failedAttempts || 0,
        "preset name": goalsObj[goal.tagId as string]?.name,
        "🏆 pb": goalsObj[goal.tagId as string]?.pb || 'N/A',
        "pb date": goalsObj[goal.tagId as string]?.pbTimestamp ? new Date(goalsObj[goal.tagId as string].pbTimestamp).toLocaleString() : 'N/A',
        [`${emojiForPresetConfigOption["language"]}`]: `${goalsObj[goal.tagId as string]?.presetOptions?.config?.language}`,
        "mode": `${mode} ${modeNumber}`,
        [`${emojiForPresetConfigOption["minWpmCustomSpeed"]}`]: goalsObj[goal.tagId as string]?.presetOptions?.config?.minWpmCustomSpeed || 0,
        [`${emojiForPresetConfigOption["minAccCustom"]}`]: goalsObj[goal.tagId as string]?.presetOptions?.config?.minAccCustom || 0,
        [`${emojiForPresetConfigOption["minBurstCustomSpeed"]}`]: goalsObj[goal.tagId as string]?.presetOptions?.config?.minBurstCustomSpeed || 0,
        [`${emojiForPresetConfigOption["blindMode"]}`]: goalsObj[goal.tagId as string]?.presetOptions?.config?.blindMode || false,
        "extra preset options": goalsObj[goal.tagId as string]?.presetOptions ? Object.entries(goalsObj[goal.tagId as string].presetOptions.config || {}).reduce((acc, [key, value]) => {
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
          if ((key === "minBurst" && value === "off") || (key === "minBurstCustomSpeed") && goalsObj[goal.tagId as string].presetOptions.config.minBurst === "off") {
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
    } else {
      object = {
          "status": goalsObj[goal.tagId as string]?.count >= goal.totalTests ? `✅` : `❌`,
          name: goal.name,
          "how many more?": goal.totalTests - goalsObj[goal.tagId as string]?.count > 0 ? goal.totalTests - goalsObj[goal.tagId as string]?.count : 0,
          "failed tests": goalsObj[goal.tagId as string]?.failedAttempts || 0,
          "preset name": goalsObj[goal.tagId as string]?.name,
          "pb 🏆": goalsObj[goal.tagId as string]?.pb || 'N/A',
          "pb date": goalsObj[goal.tagId as string]?.pbTimestamp ? new Date(goalsObj[goal.tagId as string].pbTimestamp).toLocaleString() : 'N/A',
      }
    }
    objects.push(object)
  }

  console.table(objects, Object.keys(objects[0]))
}