import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { TB_countries } from './country.schema';

export const TB_states = pgTable('states', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    countryId: integer('country_id').references(() => TB_countries.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type State = typeof TB_states.$inferSelect;
export type NewState = typeof TB_states.$inferInsert;
