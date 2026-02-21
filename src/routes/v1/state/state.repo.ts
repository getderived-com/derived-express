import { db } from "../../../shared/db";
import {
  TB_states,
  type State,
  type NewState,
} from "../../../shared/db/schema";
import { eq, sql } from "drizzle-orm";

export const createStateRepo = async (data: NewState): Promise<State> => {
  const [state] = await db.insert(TB_states).values(data).returning();
  return state;
};

export const findStateByIdRepo = async (id: number): Promise<State | null> => {
  const [state] = await db
    .select()
    .from(TB_states)
    .where(eq(TB_states.id, id))
    .limit(1);
  return state || null;
};

export const findStatesByCountryIdRepo = async (
  countryId: number,
): Promise<State[]> => {
  return await db
    .select()
    .from(TB_states)
    .where(eq(TB_states.countryId, countryId))
    .orderBy(TB_states.name);
};

export const updateStateRepo = async (
  id: number,
  data: Partial<NewState>,
): Promise<State> => {
  const [state] = await db
    .update(TB_states)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(TB_states.id, id))
    .returning();
  return state;
};

export const deleteStateRepo = async (id: number): Promise<State> => {
  const [state] = await db
    .delete(TB_states)
    .where(eq(TB_states.id, id))
    .returning();
  return state;
};

export const existsStateRepo = async (id: number): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(TB_states)
    .where(eq(TB_states.id, id));
  return Number(result?.count || 0) > 0;
};
