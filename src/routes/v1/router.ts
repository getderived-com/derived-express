import { Router } from "express";
import { countryRouter } from "./country/country.routes";
import { stateRouter } from "./state/state.routes";
import { cityRouter } from "./city/city.routes";

// IMPORT OTHER ROUTES

const routerv1: Router = Router();

// APPEND API ROUTES
routerv1.use("/countries", countryRouter);
routerv1.use("/states", stateRouter);
routerv1.use("/city", cityRouter);

export default routerv1;
