import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { CountryController } from "./country.controller";
import {
    countryFiltersSchema,
    searchTermParamSchema,
    countryCodeParamSchema,
    createCountrySchema,
    updateCountrySchema
} from "./country.validation";
import { idParamSchema } from "../../../shared/utils/_zod-utils/id-params";

const countryRouter: Router = Router();
const countryController = new CountryController();

// GET /countries - Get all countries with optional filtering and search
countryRouter.get("/", validate({
  query: countryFiltersSchema
}), countryController.getAllCountries);

// GET /countries/count - Get countries count with optional filtering
countryRouter.get("/count", validate({
  query: countryFiltersSchema
}), countryController.getCountriesCount);

// GET /countries/search/:searchTerm - Search countries by term
countryRouter.get("/search/:searchTerm", validate({
  params: searchTermParamSchema
}), 
countryController.searchCountries);

// GET /countries/code/:code - Get country by code
countryRouter.get("/code/:code", validate({
  params: countryCodeParamSchema
}), countryController.getCountryByCode);

// GET /countries/:id - Get country by ID
countryRouter.get("/:id", validate({
  params: idParamSchema
}), countryController.getCountryById);

// POST /countries - Create new country
countryRouter.post("/", validate({
  body: createCountrySchema
}), countryController.createCountry);

// PUT /countries/:id - Update country
countryRouter.put("/:id", validate({
  body: updateCountrySchema
}), countryController.updateCountry);

// DELETE /countries/:id - Delete country
countryRouter.delete("/:id", validate({
  params: idParamSchema
}), countryController.deleteCountry);

export default countryRouter;
