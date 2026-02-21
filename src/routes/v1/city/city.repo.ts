import { db } from "../../../shared/db";
import { TB_cities, type City, type NewCity } from "../../../shared/db/schema";
import { eq } from "drizzle-orm";

export const createCityRepo = async (data: NewCity): Promise<City> => {
  const [city] = await db.insert(TB_cities).values(data).returning();
  return city;
};

export const findCityByIdRepo = async (id: number): Promise<City | null> => {
  const [city] = await db
    .select()
    .from(TB_cities)
    .where(eq(TB_cities.id, id))
    .limit(1);

  return city || null;
};

export const findCitiesByStateIdRepo = async (
  stateId: number,
): Promise<City[]> => {
  return await db
    .select()
    .from(TB_cities)
    .where(eq(TB_cities.stateId, stateId))
    .orderBy(TB_cities.name);
};

export const updateCityRepo = async (
  id: number,
  data: Partial<NewCity>,
): Promise<City> => {
  const [city] = await db
    .update(TB_cities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(TB_cities.id, id))
    .returning();

  return city;
};

export const deleteCityRepo = async (id: number): Promise<City> => {
  const [city] = await db
    .delete(TB_cities)
    .where(eq(TB_cities.id, id))
    .returning();

  return city;
};
