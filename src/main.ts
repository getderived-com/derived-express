import * as dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });
import http from "http";
import app from "./express-app";
import { APP_SETTINGS } from "./shared/app-settings";
import cluster from "cluster";
import os from "os";

const gracefulShutdown = (server: http.Server) => {
  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGUSR2"];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async (err) => {
        if (err) {
          console.error("Error during server shutdown:", err);
          process.exit(1);
        }

        try {
          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error("Forcing shutdown after timeout");
        process.exit(1);
      }, 10000);
    });
  });
};

const setupHealthCheck = (server: http.Server) => {
  app.get("/health", async (req, res) => {
    try {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: APP_SETTINGS.NODE_ENV,
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });
};

async function startServer() {
  try {
    const server = http.createServer(app);

    setupHealthCheck(server);

    gracefulShutdown(server);

    server.listen(APP_SETTINGS.PORT, () => {
      console.log(
        `${APP_SETTINGS.NODE_ENV.toUpperCase()} server started at port ${APP_SETTINGS.PORT}`,
      );

      if (APP_SETTINGS.IS_PRODUCTION) {
        console.log("Running in production mode");
      }
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (APP_SETTINGS.IS_PRODUCTION && cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Master ${process.pid} is running`);
  console.log(`Forking ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  startServer();
}
