import { CountryRepository, type Country, type CreateCountryData, type UpdateCountryData, type CountryFilters } from "./country.repo";
import { BadRequestError, NotFoundError } from "../../../shared/utils/http-errors.util";

export class CountryService {
  private countryRepo: CountryRepository;

  constructor() {
    this.countryRepo = new CountryRepository();
  }

  async createCountry(data: CreateCountryData): Promise<Country> {
    // Check for duplicates
    const existingByCode = await this.countryRepo.existsByCode(data.code);
    if (existingByCode) {
      throw new BadRequestError(`Country with code '${data.code}' already exists`);
    }

    const existingByName = await this.countryRepo.existsByName(data.name);
    if (existingByName) {
      throw new BadRequestError(`Country with name '${data.name}' already exists`);
    }

    try {
      return await this.countryRepo.create(data);
    } catch (error) {
      throw new BadRequestError("Failed to create country", error);
    }
  }

  async getCountryById(id: number): Promise<Country> {
    const country = await this.countryRepo.findById(id);
    if (!country) {
      throw new NotFoundError(`Country with ID ${id} not found`);
    }

    return country;
  }

  async getCountryByCode(code: string): Promise<Country> {
    const country = await this.countryRepo.findByCode(code.toUpperCase());
    if (!country) {
      throw new NotFoundError(`Country with code '${code}' not found`);
    }

    return country;
  }

  async getAllCountries(filters?: CountryFilters): Promise<Country[]> {
    try {
      return await this.countryRepo.findAll(filters);
    } catch (error) {
      throw new BadRequestError("Failed to fetch countries", error);
    }
  }

  async updateCountry(id: number, data: UpdateCountryData): Promise<Country> {
    // Check if country exists
    const existingCountry = await this.countryRepo.findById(id);
    if (!existingCountry) {
      throw new NotFoundError(`Country with ID ${id} not found`);
    }

    // Check for duplicates only if the values are being changed
    if (data.code && data.code !== existingCountry.code) {
      const existingByCode = await this.countryRepo.existsByCode(data.code);
      if (existingByCode) {
        throw new BadRequestError(`Country with code '${data.code}' already exists`);
      }
    }

    if (data.name && data.name !== existingCountry.name) {
      const existingByName = await this.countryRepo.existsByName(data.name);
      if (existingByName) {
        throw new BadRequestError(`Country with name '${data.name}' already exists`);
      }
    }

    try {
      return await this.countryRepo.update(id, data);
    } catch (error) {
      throw new BadRequestError("Failed to update country", error);
    }
  }

  async deleteCountry(id: number): Promise<Country> {
    // Check if country exists
    const existingCountry = await this.countryRepo.findById(id);
    if (!existingCountry) {
      throw new NotFoundError(`Country with ID ${id} not found`);
    }

    try {
      return await this.countryRepo.delete(id);
    } catch (error) {
      throw new BadRequestError("Failed to delete country", error);
    }
  }

  async getCountriesCount(filters?: CountryFilters): Promise<number> {
    try {
      return await this.countryRepo.count(filters);
    } catch (error) {
      throw new BadRequestError("Failed to count countries", error);
    }
  }

  async searchCountries(searchTerm: string): Promise<Country[]> {
    const filters: CountryFilters = {
      name: searchTerm.trim()
    };

    return await this.getAllCountries(filters);
  }
}
