import { db } from "../../../shared/db";
import { TB_countries, type Country, type NewCountry } from "../../../shared/db/schema";
import { eq, ilike, sql, and } from "drizzle-orm";

export interface CountryFilters {
  name?: string;
  code?: string;
}

export const createCountryRepo = async (data: NewCountry): Promise<Country> => {
  const [country] = await db.insert(TB_countries).values(data).returning();
  return country;
};

export const findCountryByIdRepo = async (id: number): Promise<Country | null> => {
  const [country] = await db
    .select()
    .from(TB_countries)
    .where(eq(TB_countries.id, id))
    .limit(1);
  return country || null;
};

export const findCountryByCodeRepo = async (code: string): Promise<Country | null> => {
  const [country] = await db
    .select()
    .from(TB_countries)
    .where(eq(TB_countries.code, code))
    .limit(1);
  return country || null;
};

export const findAllCountriesRepo = async (filters?: CountryFilters): Promise<Country[]> => {
  const conditions = [];
  
  if (filters?.name) {
    conditions.push(ilike(TB_countries.name, `%${filters.name}%`));
  }
  
  if (filters?.code) {
    conditions.push(eq(TB_countries.code, filters.code));
  }

  const query = db.select().from(TB_countries);
  
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(TB_countries.name);
  }

  return await query.orderBy(TB_countries.name);
};

export const updateCountryRepo = async (id: number, data: Partial<NewCountry>): Promise<Country> => {
  const [country] = await db
    .update(TB_countries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(TB_countries.id, id))
    .returning();
  return country;
};

export const deleteCountryRepo = async (id: number): Promise<Country> => {
  const [country] = await db
    .delete(TB_countries)
    .where(eq(TB_countries.id, id))
    .returning();
  return country;
};

export const countCountriesRepo = async (filters?: CountryFilters): Promise<number> => {
  const conditions = [];
  
  if (filters?.name) {
    conditions.push(ilike(TB_countries.name, `%${filters.name}%`));
  }
  
  if (filters?.code) {
    conditions.push(eq(TB_countries.code, filters.code));
  }

  const query = db.select({ count: sql<number>`count(*)` }).from(TB_countries);
  
  if (conditions.length > 0) {
    const [result] = await query.where(and(...conditions));
    return Number(result?.count || 0);
  }

  const [result] = await query;
  return Number(result?.count || 0);
};

export const existsCountryRepo = async (id: number): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(TB_countries)
    .where(eq(TB_countries.id, id));
  return Number(result?.count || 0) > 0;
};

export const existsCountryByCodeRepo = async (code: string): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(TB_countries)
    .where(eq(TB_countries.code, code));
  return Number(result?.count || 0) > 0;
};
