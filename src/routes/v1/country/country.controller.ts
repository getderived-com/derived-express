import { Request, Response } from "express";
import {
  createCountryService,
  deleteCountryService,
  getAllCountriesService,
  getCountryByCodeService,
  getCountryByIdService,
  getCountriesCountService,
  searchCountriesService,
  updateCountryService,
} from "./country.service";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";

// GET /countries
export const getAllCountries = asyncHandler(async (req: Request, res: Response) => {
  const { name, code, search } = req.query;

  let countries;
  
  if (search) {
    countries = await searchCountriesService(search as string);
  } else {
    const filters = {
      name: name as string | undefined,
      code: code as string | undefined
    };
    countries = await getAllCountriesService(filters);
  }

  const count = countries.length;

  success(res, { rows: countries, count }, "Countries retrieved successfully");
});

// GET /countries/:id
export const getCountryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const country = await getCountryByIdService(Number(id));

  success(res, country, "Country retrieved successfully");
});

// GET /countries/code/:code
export const getCountryByCode = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;

  const country = await getCountryByCodeService(code);

  success(res, country, "Country retrieved successfully");
});

// POST /countries
export const createCountry = asyncHandler(async (req: Request, res: Response) => {
  const country = await createCountryService(req.body);

  success(res, country, "Country created successfully");
});

// PUT /countries/:id
export const updateCountry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const country = await updateCountryService(Number(id), req.body);

  success(res, country, "Country updated successfully");
});

// DELETE /countries/:id
export const deleteCountry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const country = await deleteCountryService(Number(id));

  success(res, country, "Country deleted successfully");
});

// GET /countries/count
export const getCountriesCount = asyncHandler(async (req: Request, res: Response) => {
  const { name, code } = req.query;

  const filters = {
    name: name as string | undefined,
    code: code as string | undefined
  };

  const count = await getCountriesCountService(filters);

  success(res, { count }, "Countries count retrieved successfully");
});
