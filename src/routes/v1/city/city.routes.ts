import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { authMiddleware } from "../../../shared/middlewares/auth.middleware";
import {
  createCity,
  deleteCity,
  getCitiesByStateId,
  getCityById,
  updateCity,
} from "./city.controller";
import {
  createCitySchema,
  stateIdParamSchema,
  updateCitySchema,
} from "./city.validation";
import { idParamSchema } from "../../../shared/utils/_zod-utils/id-params";

const cityRouter: Router = Router();

cityRouter.use(authMiddleware);

cityRouter.get(
  "/state/:stateId",
  validate({
    params: stateIdParamSchema,
  }),
  getCitiesByStateId,
);

cityRouter.get(
  "/:id",
  validate({
    params: idParamSchema,
  }),
  getCityById,
);

cityRouter.post(
  "/",
  validate({
    body: createCitySchema,
  }),
  createCity,
);

cityRouter.put(
  "/:id",
  validate({
    params: idParamSchema,
    body: updateCitySchema,
  }),
  updateCity,
);

cityRouter.delete(
  "/:id",
  validate({
    params: idParamSchema,
  }),
  deleteCity,
);

export { cityRouter };
