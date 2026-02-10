import * as dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });
const {
  NODE_ENV = "development",
  PORT = 3000,
  JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production",
  JWT_EXPIRES_IN = "7d",
  ALLOWED_ORIGINS = "http://localhost:3000",
  DATABASE_URL = "",

  // Kafka Configuration
  KAFKA_BROKERS = "localhost:9092",
  KAFKA_CLIENT_ID = "express-api",
  KAFKA_GROUP_ID = "express-api-consumer-group",
  KAFKA_CONNECTION_TIMEOUT = "10000",
  KAFKA_REQUEST_TIMEOUT = "30000",
  KAFKA_RETRY_ATTEMPTS = "5",
  KAFKA_RETRY_BACKOFF_MS = "300",
  KAFKA_LOG_LEVEL = "info",
  ENABLE_KAFKA = "true",
} = process.env;

if (NODE_ENV === "production") {
  const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL", "KAFKA_BROKERS"];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  if (JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production") {
    throw new Error("JWT_SECRET must be changed in production!");
  }
}

export const APP_SETTINGS = {
  NODE_ENV,
  PORT: parseInt(String(PORT)),
  IS_DEVELOPMENT: NODE_ENV === "development",
  IS_PRODUCTION: NODE_ENV === "production",
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ALLOWED_ORIGINS,
  DATABASE_URL,

  // Kafka Settings
  KAFKA: {
    BROKERS: KAFKA_BROKERS.split(","),
    CLIENT_ID: KAFKA_CLIENT_ID,
    GROUP_ID: KAFKA_GROUP_ID,
    CONNECTION_TIMEOUT: parseInt(KAFKA_CONNECTION_TIMEOUT),
    REQUEST_TIMEOUT: parseInt(KAFKA_REQUEST_TIMEOUT),
    RETRY: {
      ATTEMPTS: parseInt(KAFKA_RETRY_ATTEMPTS),
      BACKOFF_MS: parseInt(KAFKA_RETRY_BACKOFF_MS),
    },
    LOG_LEVEL: KAFKA_LOG_LEVEL as "debug" | "info" | "warn" | "error",
    ENABLED: ENABLE_KAFKA !== "false",
  },
};

