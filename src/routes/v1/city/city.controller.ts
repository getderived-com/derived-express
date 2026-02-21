import { Request, Response } from "express";
import {
  createCityService,
  deleteCityService,
  getCitiesByStateIdService,
  getCityByIdService,
  updateCityService,
} from "./city.service";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";

export const getCityById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const city = await getCityByIdService(Number(id));
  success(res, city, "City retrieved successfully");
});

export const getCitiesByStateId = asyncHandler(
  async (req: Request, res: Response) => {
    const { stateId } = req.params;
    const cities = await getCitiesByStateIdService(Number(stateId));
    success(res, cities, "Cities retrieved successfully");
  },
);

export const createCity = asyncHandler(async (req: Request, res: Response) => {
  const city = await createCityService(req.body);
  success(res, city, "City created successfully");
});

export const updateCity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const city = await updateCityService(Number(id), req.body);
  success(res, city, "City updated successfully");
});

export const deleteCity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const city = await deleteCityService(Number(id));
  success(res, city, "City deleted successfully");
});
