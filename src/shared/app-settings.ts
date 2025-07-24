const {
  NODE_ENV = "development",
  PORT = 3000,
  JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production",
  JWT_EXPIRES_IN = "7d",
  ALLOWED_ORIGINS = "http://localhost:3000",
  DATABASE_URL = "",
} = process.env;

if (NODE_ENV === "production") {
  const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL"];
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
  DATABASE_URL
};
