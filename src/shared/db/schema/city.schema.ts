import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { TB_states } from "./state.schema";

export const TB_cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  stateId: integer("state_id")
    .references(() => TB_states.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type City = typeof TB_cities.$inferSelect;
export type NewCity = typeof TB_cities.$inferInsert;
