import {
  createCountryRepo,
  deleteCountryRepo,
  findAllCountriesRepo,
  findCountryByIdRepo,
  findCountryByCodeRepo,
  updateCountryRepo,
  countCountriesRepo,
  existsCountryRepo,
  existsCountryByCodeRepo,
  type CountryFilters,
} from "./country.repo";
import { type Country, type NewCountry } from "../../../shared/db/schema";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";

export const createCountryService = async (data: NewCountry): Promise<Country> => {
  // Check if country code already exists
  const existingCountry = await existsCountryByCodeRepo(data.code);
  if (existingCountry) {
    throw new BadRequestError(
      `Country with code '${data.code}' already exists`,
    );
  }

  try {
    return await createCountryRepo(data);
  } catch (error) {
    throw new BadRequestError("Failed to create country", error);
  }
};

export const getCountryByIdService = async (id: number): Promise<Country> => {
  const country = await findCountryByIdRepo(id);
  if (!country) {
    throw new NotFoundError(`Country with ID ${id} not found`);
  }

  return country;
};

export const getCountryByCodeService = async (code: string): Promise<Country> => {
  const country = await findCountryByCodeRepo(code);
  if (!country) {
    throw new NotFoundError(`Country with code '${code}' not found`);
  }

  return country;
};

export const getAllCountriesService = async (filters?: CountryFilters): Promise<Country[]> => {
  try {
    return await findAllCountriesRepo(filters);
  } catch (error) {
    throw new BadRequestError("Failed to fetch countries", error);
  }
};

export const updateCountryService = async (id: number, data: Partial<NewCountry>): Promise<Country> => {
  // Check if country exists
  const existingCountry = await findCountryByIdRepo(id);
  if (!existingCountry) {
    throw new NotFoundError(`Country with ID ${id} not found`);
  }

  // Check for code duplicate only if code is being changed
  if (data.code && data.code !== existingCountry.code) {
    const existingByCode = await existsCountryByCodeRepo(data.code);
    if (existingByCode) {
      throw new BadRequestError(
        `Country with code '${data.code}' already exists`,
      );
    }
  }

  try {
    return await updateCountryRepo(id, data);
  } catch (error) {
    throw new BadRequestError("Failed to update country", error);
  }
};

export const deleteCountryService = async (id: number): Promise<Country> => {
  // Check if country exists
  const existingCountry = await findCountryByIdRepo(id);
  if (!existingCountry) {
    throw new NotFoundError(`Country with ID ${id} not found`);
  }

  try {
    return await deleteCountryRepo(id);
  } catch (error) {
    throw new BadRequestError("Failed to delete country", error);
  }
};

export const getCountriesCountService = async (filters?: CountryFilters): Promise<number> => {
  try {
    return await countCountriesRepo(filters);
  } catch (error) {
    throw new BadRequestError("Failed to count countries", error);
  }
};

export const searchCountriesService = async (searchTerm: string): Promise<Country[]> => {
  const filters: CountryFilters = {
    name: searchTerm.trim(),
  };

  return await getAllCountriesService(filters);
};
