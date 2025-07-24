import express, { Express, Response } from "express";
import path from "path";
import routerv1 from "./routes/v1/router";
import { errorHandler } from "./shared/middlewares/error-handler.middleware";
import { APP_SETTINGS } from "./shared/app-settings";
import publicRouter from "./routes/v1/public-router";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  express.json({
    limit: "10mb",
    strict: true,
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

app.use(
  "/static",
  express.static(path.join(process.cwd(), "images"), {
    maxAge: APP_SETTINGS.IS_PRODUCTION ? "1d" : "0",
    etag: true,
    lastModified: true,
  }),
);

app.use((req, res, next) => {
  (req as any).user = {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
  };
  next();
});

app.use("/api/public/v1", publicRouter);

app.use("/api/v1", routerv1);

app.use("*", (_, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    statusCode: 404,
  });
});

app.use(errorHandler);

export default app;
