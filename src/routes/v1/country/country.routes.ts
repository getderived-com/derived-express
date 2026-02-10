import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import {
  createCountry,
  deleteCountry,
  getAllCountries,
  getCountryByCode,
  getCountryById,
  getCountriesCount,
  updateCountry,
} from "./country.controller";
import {
    countryFiltersSchema,
    searchTermParamSchema,
    countryCodeParamSchema,
    createCountrySchema,
    updateCountrySchema,
} from "./country.validation";
import { idParamSchema } from "../../../shared/utils/_zod-utils/id-params";

const countryRouter: Router = Router();

// GET /countries - Get all countries with optional filtering and search
countryRouter.get("/", validate({
  query: countryFiltersSchema
}), getAllCountries);

// GET /countries/count - Get countries count with optional filtering
countryRouter.get("/count", validate({
  query: countryFiltersSchema
}), getCountriesCount);

// GET /countries/code/:code - Get country by code
countryRouter.get("/code/:code", validate({
  params: countryCodeParamSchema
}), getCountryByCode);

// GET /countries/:id - Get country by ID
countryRouter.get("/:id", validate({
  params: idParamSchema
}), getCountryById);

// POST /countries - Create new country
countryRouter.post("/", validate({
  body: createCountrySchema
}), createCountry);

// PUT /countries/:id - Update country
countryRouter.put("/:id", validate({
  params: idParamSchema,
  body: updateCountrySchema
}), updateCountry);

// DELETE /countries/:id - Delete country
countryRouter.delete("/:id", validate({
  params: idParamSchema
}), deleteCountry);


export {
  countryRouter
};
