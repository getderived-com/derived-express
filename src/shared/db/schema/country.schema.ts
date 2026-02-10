import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const TB_countries = pgTable('countries', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 10 }).notNull(),
    phoneCode: varchar('phone_code', { length: 10 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Country = typeof TB_countries.$inferSelect;
export type NewCountry = typeof TB_countries.$inferInsert;
