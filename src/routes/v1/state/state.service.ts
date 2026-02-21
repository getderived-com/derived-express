import {
  createStateRepo,
  deleteStateRepo,
  findStatesByCountryIdRepo,
  findStateByIdRepo,
  updateStateRepo,
  existsStateRepo,
} from "./state.repo";
import { type State, type NewState } from "../../../shared/db/schema";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";

// Optionally we could check if country exists before creating/updating state.
// We can assume foreign key constraint will throw an error, which we catch.

export const createStateService = async (data: NewState): Promise<State> => {
  try {
    return await createStateRepo(data);
  } catch (error: any) {
    if (error.message?.includes("foreign key constraint")) {
      throw new BadRequestError(
        `Country with ID ${data.countryId} does not exist.`,
        error,
      );
    }
    throw new BadRequestError("Failed to create state", error);
  }
};

export const getStateByIdService = async (id: number): Promise<State> => {
  const state = await findStateByIdRepo(id);
  if (!state) {
    throw new NotFoundError(`State with ID ${id} not found`);
  }

  return state;
};

export const getStatesByCountryIdService = async (
  countryId: number,
): Promise<State[]> => {
  try {
    return await findStatesByCountryIdRepo(countryId);
  } catch (error) {
    throw new BadRequestError("Failed to fetch states for country", error);
  }
};

export const updateStateService = async (
  id: number,
  data: Partial<NewState>,
): Promise<State> => {
  // Check if state exists
  const existingState = await findStateByIdRepo(id);
  if (!existingState) {
    throw new NotFoundError(`State with ID ${id} not found`);
  }

  try {
    return await updateStateRepo(id, data);
  } catch (error: any) {
    if (error.message?.includes("foreign key constraint")) {
      throw new BadRequestError(
        `Country with ID ${data.countryId} does not exist.`,
        error,
      );
    }
    throw new BadRequestError("Failed to update state", error);
  }
};

export const deleteStateService = async (id: number): Promise<State> => {
  // Check if state exists
  const existingState = await findStateByIdRepo(id);
  if (!existingState) {
    throw new NotFoundError(`State with ID ${id} not found`);
  }

  try {
    return await deleteStateRepo(id);
  } catch (error: any) {
    if (error.message?.includes("foreign key constraint")) {
      throw new BadRequestError(
        `Cannot delete state because it is referenced by another entity.`,
        error,
      );
    }
    throw new BadRequestError("Failed to delete state", error);
  }
};
