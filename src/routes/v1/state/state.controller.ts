import { Request, Response } from "express";
import {
  createStateService,
  deleteStateService,
  getStateByIdService,
  getStatesByCountryIdService,
  updateStateService,
} from "./state.service";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";

// GET /states/:id
export const getStateById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const state = await getStateByIdService(Number(id));
    success(res, state, "State retrieved successfully");
  },
);

// GET /states/country/:countryId
export const getStatesByCountryId = asyncHandler(
  async (req: Request, res: Response) => {
    const { countryId } = req.params;
    const states = await getStatesByCountryIdService(Number(countryId));
    success(res, states, "States retrieved successfully");
  },
);

// POST /states
export const createState = asyncHandler(async (req: Request, res: Response) => {
  const state = await createStateService(req.body);
  success(res, state, "State created successfully");
});

// PUT /states/:id
export const updateState = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const state = await updateStateService(Number(id), req.body);
  success(res, state, "State updated successfully");
});

// DELETE /states/:id
export const deleteState = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const state = await deleteStateService(Number(id));
  success(res, state, "State deleted successfully");
});
