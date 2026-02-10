// Make sure to install the 'pg' package 
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { APP_SETTINGS } from "../app-settings";

const pool = new Pool({
  connectionString: APP_SETTINGS.DATABASE_URL,
});
export const db = drizzle({ client: pool, schema });

export const checkDBConnection = async () => {
    try {
        await db.select().from(schema.user).limit(1);
        console.log("Database connection successful");
    } catch (error) {
        console.error("Failed to connect to the database:", error);
    }
};
