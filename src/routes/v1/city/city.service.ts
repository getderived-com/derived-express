import {
  createCityRepo,
  deleteCityRepo,
  findCitiesByStateIdRepo,
  findCityByIdRepo,
  updateCityRepo,
} from "./city.repo";
import { type City, type NewCity } from "../../../shared/db/schema";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";

export const createCityService = async (data: NewCity): Promise<City> => {
  try {
    return await createCityRepo(data);
  } catch (error: any) {
    if (error.message?.includes("foreign key constraint")) {
      throw new BadRequestError(
        `State with ID ${data.stateId} does not exist.`,
        error,
      );
    }

    throw new BadRequestError("Failed to create city", error);
  }
};

export const getCityByIdService = async (id: number): Promise<City> => {
  const city = await findCityByIdRepo(id);
  if (!city) {
    throw new NotFoundError(`City with ID ${id} not found`);
  }

  return city;
};

export const getCitiesByStateIdService = async (
  stateId: number,
): Promise<City[]> => {
  try {
    return await findCitiesByStateIdRepo(stateId);
  } catch (error) {
    throw new BadRequestError("Failed to fetch cities for state", error);
  }
};

export const updateCityService = async (
  id: number,
  data: Partial<NewCity>,
): Promise<City> => {
  const existingCity = await findCityByIdRepo(id);
  if (!existingCity) {
    throw new NotFoundError(`City with ID ${id} not found`);
  }

  try {
    return await updateCityRepo(id, data);
  } catch (error: any) {
    if (error.message?.includes("foreign key constraint")) {
      throw new BadRequestError(
        `State with ID ${data.stateId} does not exist.`,
        error,
      );
    }

    throw new BadRequestError("Failed to update city", error);
  }
};

export const deleteCityService = async (id: number): Promise<City> => {
  const existingCity = await findCityByIdRepo(id);
  if (!existingCity) {
    throw new NotFoundError(`City with ID ${id} not found`);
  }

  try {
    return await deleteCityRepo(id);
  } catch (error: any) {
    if (error.message?.includes("foreign key constraint")) {
      throw new BadRequestError(
        "Cannot delete city because it is referenced by another entity.",
        error,
      );
    }

    throw new BadRequestError("Failed to delete city", error);
  }
};
