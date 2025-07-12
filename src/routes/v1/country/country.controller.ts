import { Request, Response } from "express";
import { CountryService } from "./country.service";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";

export class CountryController {
  private countryService: CountryService;

  constructor() {
    this.countryService = new CountryService();
  }

  // GET /countries
  getAllCountries = asyncHandler(async (req: Request, res: Response) => {
    const { name, code, search } = req.query;

    let countries;
    
    if (search) {
      countries = await this.countryService.searchCountries(search as string);
    } else {
      const filters = {
        name: name as string | undefined,
        code: code as string | undefined
      };
      countries = await this.countryService.getAllCountries(filters);
    }

    const count = countries.length;

    success(res, { rows: countries, count }, "Countries retrieved successfully");
  });

  // GET /countries/:id
  getCountryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const country = await this.countryService.getCountryById(Number(id));

    success(res, country, "Country retrieved successfully");
  });

  // GET /countries/code/:code
  getCountryByCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;

    const country = await this.countryService.getCountryByCode(code);

    success(res, country, "Country retrieved successfully");
  });

  // POST /countries
  createCountry = asyncHandler(async (req: Request, res: Response) => {
    const country = await this.countryService.createCountry(req.body);

    success(res, country, "Country created successfully");
  });

  // PUT /countries/:id
  updateCountry = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const country = await this.countryService.updateCountry(Number(id), req.body);

    success(res, country, "Country updated successfully");
  });

  // DELETE /countries/:id
  deleteCountry = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const country = await this.countryService.deleteCountry(Number(id));

    success(res, country, "Country deleted successfully");
  });

  // GET /countries/count
  getCountriesCount = asyncHandler(async (req: Request, res: Response) => {
    const { name, code } = req.query;

    const filters = {
      name: name as string | undefined,
      code: code as string | undefined
    };

    const count = await this.countryService.getCountriesCount(filters);

    success(res, { count }, "Countries count retrieved successfully");
  });

  // GET /countries/search/:searchTerm
  searchCountries = asyncHandler(async (req: Request, res: Response) => {
    const { searchTerm } = req.params;

    const countries = await this.countryService.searchCountries(searchTerm);

    success(res, { countries, count: countries.length }, "Countries search completed successfully");
  });
}
