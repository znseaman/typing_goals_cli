import 'dotenv/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import Conf from 'conf';
import { read } from "read";

import * as schema from './schema.js'
import { logger } from '../ui/logger.js';
import { sql } from 'drizzle-orm';
import { getDbErrorMessage } from './dbErrorUtils.js';
import { Pool } from 'pg';

export async function initializeDB(config: Conf) {
  let dbURL = await promptDbURL(config)
  return drizzle(dbURL, {schema})
}

export async function promptDbURL(config: Conf): Promise<string> {
  // Check database connection
  let dbURL = String(config.get("dbURL") || "")
  if (!dbURL) {
    logger.log(`\nPlease enter your database url from the pre-setup process to use the Typing Goals CLI.\n`)
    try {
      dbURL = await read({prompt: "Enter database url: ", default: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres", silent: false});
      config.set("dbURL", dbURL)
      logger.success("Successfully set the database url!")
    } catch (error) {
      if ((error as Error).message !== "canceled") {
        logger.error(`An error occurred: ${(error as Error).message}. Please try again.`)
        dbURL = ""
      }
    }
  }
  return dbURL
}

export async function testConnection(db: NodePgDatabase<typeof import("./schema.js")> & {
    $client: Pool;
  }) {
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    const { message } = getDbErrorMessage(error);
    throw new Error(message);
  }
}