import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import Conf from 'conf';
import { read } from "read";

import * as schema from './schema.js'
import { logger } from '../ui/logger.js';

export async function initializeDB(config: Conf) {
  let dbURL = await promptDbURL(config)
  return drizzle(dbURL, {schema})
}

export async function promptDbURL(config: Conf): Promise<string> {
  // Check database connection
  let dbURL = String(config.get("dbURL") || "")
  if (!dbURL) {
    logger.log(`\nPlease enter your database url to use for the CLI obtained from the pre-setup process\n`)
    try {
      dbURL = await read({prompt: "Enter url: ", silent: false});
      config.set("dbURL", dbURL)
      logger.success(`Successfully set the database url!`)
    } catch (error) {
      if ((error as Error).message !== "canceled") {
        logger.error(`An error occurred: ${(error as Error).message}. Please try again.`)
        dbURL = ""
      }
    }
  }
  return dbURL
}