
import { setConfig } from "../config.js";
import { initializeReadline, initializeReadlineHandlers, type State } from "../state.js";
import { read } from "read";
import { getAllResults } from "./results.js";
import { ResultResponse } from "../monkeytype.js";

type Goal = {
  id: string
  presetId: string
  name: string
  tagId: string
  timeframe: string
  totalTests: number
  createdAt: number
  updatedAt: number
}

export async function commandGoals(state: State, args?: string[]): Promise<void> {
  
  // @ts-ignore
  const [crudType] = args

  switch (crudType) {
    case "create":
      // Close down the previous readline to make way for enquirer's readline
      state.readline.close()

      try {
        await createGoal(state)
      } catch (error) {
        console.log(`An error occurred in creating goal: ${error}. Please try again.`)
      } finally {
        // Re-create the previous readline and attach the necessary state to it
        state.readline = initializeReadline()
        initializeReadlineHandlers(state)
      }

      break;
    case "edit":
      // Close down the previous readline to make way for enquirer's readline
      state.readline.close()

      try {
        await editGoal(state)
      } catch (error) {
        console.log(`An error occurred in creating goal: ${error}. Please try again.`)
      } finally {
        // Re-create the previous readline and attach the necessary state to it
        state.readline = initializeReadline()
        initializeReadlineHandlers(state)
      }

      break;
    case "delete":
      // Close down the previous readline to make way for enquirer's readline
      state.readline.close()

      try {
        await deleteGoal(state)
      } catch (error) {
        console.log(`An error occurred in creating goal: ${error}. Please try again.`)
      } finally {
        // Re-create the previous readline and attach the necessary state to it
        state.readline = initializeReadline()
        initializeReadlineHandlers(state)
      }

      break;
    default:
      // list current goals
      const goals = state.config.get("goals") as Array<Goal> || []
      if (goals.length === 0) {
        console.log(`\nNo goals created yet. Type "goals create" to create your first goal\n`)
        return
      }

      try {
        const allResults = await getAllResults(state)
        const presets = state.config.get("presets") as Array<Record<string, any>> || []

        // get all the tags for this user
        const tags = state.config.get("tags") as Array<Record<string, any>> || []
        const tagsObj = {} as Record<string, {count: number; goal: number; name: string, goalName: string, goalTimeFrame: string, goalTotalTests: number, presetOptions: Record<string, any>}>
        for (const tag of tags) {
          let associatedGoal = goals.find((goal) => goal.tagId == tag._id)
          if (associatedGoal) {
            let associatedPreset = presets.find((preset) => preset._id == associatedGoal.presetId)
            
            tagsObj[tag._id] = {
              count: 0,
              goal: associatedGoal ? associatedGoal.totalTests : 0,
              goalName: associatedGoal?.name,
              goalTimeFrame: associatedGoal?.timeframe,
              goalTotalTests: associatedGoal?.totalTests,
              name: tag.name,
              presetOptions: associatedPreset || {},
            }
          }
        }

        for (const result of allResults as ResultResponse[]) {
          const tagId = result.tags[0]
          if (tagsObj[tagId]) {
            tagsObj[tagId].count += 1
          }
        }

        printGoalsTable(goals, tagsObj)
      } catch (error) {
        console.log(`An error occurred in listing goals: ${error}. Please try again.`)
      }
      break;
  }
}

export function printGoals(
  results: ResultResponse[],
  tagsObj: Record<string, {count: number; goal: number; name: string, goalName: string, goalTimeFrame: string}>,
) {
  let string = `\nTyping Goals By Name and Preset:\n`

  let totalSeconds = 0

  for (const result of results) {
    const tagId = result.tags[0]
    if (tagsObj[tagId]) {
      tagsObj[tagId].count += 1
    }

    totalSeconds += result.testDuration
    if (result.incompleteTestSeconds) {
      totalSeconds += result.incompleteTestSeconds
    }
  }

  let goalsMet = 0

  for (const [key] of Object.entries(tagsObj)) {
    const metGoal = tagsObj[key].count >= tagsObj[key].goal
    if (metGoal) goalsMet++
    const metGoalIcon = metGoal ? `✅` : `❌`
    const displayHowManyMore = metGoal ? `` : ` (Use preset "${tagsObj[key].name}" to complete ${tagsObj[key].goal - tagsObj[key].count} more)`
    string += `${metGoalIcon} ${tagsObj[key].goalName}${displayHowManyMore}\n`
  }

  let goalsMetPercent = Math.round((goalsMet / Object.keys(tagsObj).length) * 100)
  let goalsMetText = goalsMetPercent == 100 ? '🎉 100% 🎉' : `${goalsMetPercent}%`
  string += `\nPercentage of Goals Met Today: ${goalsMetText}\n`

  string += `\nMore statistics:\n`
  string += `- Time Spent Typing Today: ${Math.round(totalSeconds / 60)} minutes \n`
  string += `\nTo complete the rest of your planned typing goals for today, go to MonkeyType, select your preset associated with your goal (Shift+⌘+P + Presets + PRESET_NAME), and get to typing!\n`

  console.log(string)
}

async function createGoal(state: State) {
  console.log(`Create your goal by following the prompt below:`)

  const name = await read({prompt: "Enter daily goal name: "});
  const timeframe = await read({prompt: "Enter goal time frame (only daily): ", default: "daily", edit: false});
  const tagName = await read({prompt: "Enter tag name to connect this goal to: "});
  const totalTests = await read({prompt: "Enter number of tests to meet goal: "});

  const tags = state.config.get("tags") as Array<Record<string, any>> || []

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

  const presets = state.config.get("presets") as Array<Record<string, any>> || []

  let presetId
  for (const preset of presets) {
    if (preset.config.tags.includes(tagId)) {
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

  const now = Date.now()
  
  const goal: Goal = {
    id: tagName,
    presetId,
    name,
    tagId,
    timeframe: timeframe,
    totalTests: Number(totalTests),
    createdAt: now,
    updatedAt: now,
  }

  const currentGoals = state.config.get("goals") as Array<Record<string, any>> || []

  // verify the goal created doesn't conflict with an existing goal that uses the same presetId and tagId
  for (let oldGoal of currentGoals) {
    const samePresetId = goal.presetId == oldGoal.presetId
    const sameTagId = goal.tagId && oldGoal.tagId
    if (samePresetId && sameTagId) {
      console.log(`Unable to create goal due to conflict with existing goal using tagName ${oldGoal.id}). Only one goal can exist per tag / preset combination.`)
      return
    }
  }

  const allGoals = [...currentGoals, goal]

  setConfig({"goals": allGoals}, state.config)

  console.log(`\nSuccessfully created a new goal named "${goal.name}"`)
}

async function editGoal(state: State) {
  console.log(`Edit your goal by following the prompt below:`)

  const name = await read({prompt: "Enter the daily goal name to edit: "});
  const totalTests = await read({prompt: "Enter new number of tests to meet goal: "});

  const currentGoals = state.config.get("goals") as Array<Record<string, any>> || []

  let oldGoal = currentGoals.find((goal) => goal.name === name) as Goal
  if (!oldGoal) {
    console.log(`There is no goal "${name}" associated with this account. Enter another goal name.`)
  }

  if (Number.isNaN(Number(totalTests))) {
    console.log(`Invalid number of tests entered (${totalTests}). Enter in a number.`)
    return
  }

  const now = Date.now()

  const goal: Goal = {
    ...oldGoal,
    totalTests: Number(totalTests),
    updatedAt: now,
  }

  const allGoals = currentGoals.map((oldGoal) => {
    return oldGoal.name == goal.name ? goal : oldGoal
  })

  setConfig({"goals": allGoals}, state.config)

  console.log(`\nSuccessfully edited the goal named "${goal.name}"`)
}

async function deleteGoal(state: State) {
  console.log(`Delete your goal by following the prompt below:`)

  const name = await read({prompt: "Enter the daily goal name to delete: "});

  const currentGoals = state.config.get("goals") as Array<Record<string, any>> || []

  let oldGoal = currentGoals.find((goal) => goal.name === name) as Goal
  if (!oldGoal) {
    console.log(`There is no goal "${name}" associated with this account. Enter another goal name.`)
  }

  const allGoals: Array<Record<string, any>> = []
  for (let goal of currentGoals) {
    if (goal.name == oldGoal.name) {
      continue;
    }
    allGoals.push(goal)
  }

  setConfig({"goals": allGoals}, state.config)

  console.log(`\nSuccessfully deleted the goal named "${oldGoal.name}"`)
}

export function printGoalsTable(
  goals: Array<Record<string, any>>,
  tagsObj: Record<string, {count: number; goal: number; name: string, goalName: string, goalTimeFrame: string, goalTotalTests: number, presetOptions: Record<string, any>}>,
) {
  const startOfTodayUTC = Number(new Date(new Date().toISOString().split('T')[0]))
  console.log(`\nToday's Goals (Since ${new Date(startOfTodayUTC).toLocaleString()}):`)

  const bannedPresetOptions = ["accountChart", "customBackgroundFilter", "customLayoutfluid", "customPolyglot", "customThemeColors", "funbox", "liveAccStyle", "liveBurstStyle", "quickRestart", "quoteLength", "timerStyle", "burstHeatmap", "singleListCommandLine", "playSoundOnError", "fontSize", "favThemes", "theme", "tags"]

  const objects = []
  for (let goal of goals) {
    let object = {
      "met goal": tagsObj[goal.tagId]?.count >= goal.totalTests ? `✅` : `❌`,
      name: goal.name,
      "# of completed tests": tagsObj[goal.tagId]?.count || 0,
      "# of tests to complete": goal.totalTests - tagsObj[goal.tagId]?.count > 0 ? goal.totalTests - tagsObj[goal.tagId]?.count : 0,
      "preset name": tagsObj[goal.tagId]?.name,
      "time frame": goal.timeframe,
      "goal defining preset options": tagsObj[goal.tagId]?.presetOptions ? Object.entries(tagsObj[goal.tagId].presetOptions.config).reduce((acc, [key, value]) => {
        if (bannedPresetOptions.includes(key)) return acc

        // suppress these options if it's "custom" since it doesn't give any meaningful information about the preset
        if ((key === "minWpm" || key === "minAcc") && value === "custom") {
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

        acc.push(`${key}: ${value}`)
        return acc
      }, [] as string[]).join(`, `) : 'N/A',
    }
    objects.push(object)
  }

  console.table(objects, Object.keys(objects[0]))
}