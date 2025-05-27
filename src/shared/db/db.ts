import { APP_SETTINGS } from "../app-settings";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const pool = new Pool({
  host: APP_SETTINGS.DB_HOST,
  port: APP_SETTINGS.DB_PORT,
  user: APP_SETTINGS.DB_USERNAME,
  password: APP_SETTINGS.DB_PASSWORD,
  database: APP_SETTINGS.DB_NAME,
});

export const db = drizzle(pool, {
  logger: true,
});

export type Db = typeof db;

// write a function to check if the db is connected
export const checkDBConnection = async () => {
  try {
    await pool.query("SELECT 1");
    console.log(`DB connected: ${APP_SETTINGS.DB_NAME}`);
  } catch (error) {
    console.error("Error checking DB connection:", error);
  }
};
