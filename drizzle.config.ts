import type { Config } from "drizzle-kit";
export default {
  schema: "./src/shared/db/schema/**/*.schema.ts",
  out: "./src/shared/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: `postgresql://postgres:@localhost:5434/little-zoho`,
  },
} satisfies Config;
