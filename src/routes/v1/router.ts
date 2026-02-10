import { Router } from "express";
import { countryRouter } from "./country/country.routes";

// IMPORT OTHER ROUTES

const routerv1: Router = Router();

// APPEND API ROUTES
routerv1.use("/countries", countryRouter);

export default routerv1;

