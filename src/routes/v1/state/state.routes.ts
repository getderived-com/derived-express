import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { authMiddleware } from "../../../shared/middlewares/auth.middleware";
import {
  createState,
  deleteState,
  getStateById,
  getStatesByCountryId,
  updateState,
} from "./state.controller";
import {
  createStateSchema,
  updateStateSchema,
  countryIdParamSchema,
} from "./state.validation";
import { idParamSchema } from "../../../shared/utils/_zod-utils/id-params";

const stateRouter: Router = Router();

// Apply auth middleware to all routes
stateRouter.use(authMiddleware);

// GET /states/country/:countryId - Get states by country ID
stateRouter.get(
  "/country/:countryId",
  validate({
    params: countryIdParamSchema,
  }),
  getStatesByCountryId,
);

// GET /states/:id - Get state by ID
stateRouter.get(
  "/:id",
  validate({
    params: idParamSchema,
  }),
  getStateById,
);

// POST /states - Create new state
stateRouter.post(
  "/",
  validate({
    body: createStateSchema,
  }),
  createState,
);

// PUT /states/:id - Update state
stateRouter.put(
  "/:id",
  validate({
    params: idParamSchema,
    body: updateStateSchema,
  }),
  updateState,
);

// DELETE /states/:id - Delete state
stateRouter.delete(
  "/:id",
  validate({
    params: idParamSchema,
  }),
  deleteState,
);

export { stateRouter };
