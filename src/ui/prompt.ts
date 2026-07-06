import { read } from "read"
import { boldText } from "./logger.js"

export async function confirm(promptText: string, defaultAnswer: "y" | "n" = "n"): Promise<boolean> {
  const answer = await read({ prompt: boldText(promptText), default: defaultAnswer })
  return answer.toLowerCase() === "y"
}
