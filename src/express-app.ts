import compression from "compression";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import path from "path";
import routerv1 from "./routes/v1/router";
import { errorHandler } from "./shared/middlewares/error-handler.middleware";


const app: Express = express();

app
  .use(cors())
  .use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  )
  .use(compression())
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(
    helmet.frameguard({
      action: "deny",
    })
  )
  .use("/static", express.static(path.join(process.cwd() + "/mx-images/")))
  // Swagger UI


//init all the modules
app.use("/api/v1", routerv1);


//global error handler
app.use(errorHandler);

export default app;
