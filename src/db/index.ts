import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import Conf from 'conf';
import { read } from "read";

import * as schema from './schema.js'

export async function initializeDB(config: Conf) {
  let dbURL = await promptDbURL(config)
  return drizzle(dbURL, {schema})
}

export async function promptDbURL(config: Conf): Promise<string> {
  // Check database connection
  let dbURL = String(config.get("dbURL") || "")
  if (!dbURL) {
    console.log(`\nPlease enter your database url to use for the CLI obtained from the pre-setup process\n`)
    try {
      dbURL = await read({prompt: "Enter url: ", silent: false});
      config.set("dbURL", dbURL)
    } catch (error) {
      if ((error as Error).message !== "canceled") {
        console.log(`An error occurred: ${error}. Please try again.`)
      }
    }
  }
  return dbURL
}