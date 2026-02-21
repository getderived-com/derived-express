import { Router } from "express";
import { countryRouter } from "./country/country.routes";
import { stateRouter } from "./state/state.routes";

// IMPORT OTHER ROUTES

const routerv1: Router = Router();

// APPEND API ROUTES
routerv1.use("/countries", countryRouter);
routerv1.use("/states", stateRouter);

export default routerv1;
