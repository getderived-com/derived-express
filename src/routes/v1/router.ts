import { Router } from "express";
import countryRouter from "./country/country.routes";
import userRouter from "./user/user.routes";
import chatRouter from "./chat/chat.routes";
// IMPORT OTHER ROUTES

const routerv1: Router = Router();

routerv1.use("/countries", countryRouter);
routerv1.use("/users", userRouter);
routerv1.use("/chat", chatRouter);
// APPEND API ROUTES

export default routerv1;
