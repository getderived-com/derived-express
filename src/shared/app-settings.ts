const {
  NODE_ENV = "development",
  PORT = 3001,
  JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production",
  JWT_EXPIRES_IN = "7d",
  ALLOWED_ORIGINS = "http://localhost:3000",
  DATABASE_URL = "",
  // AI Configuration
  OPENAI_API_KEY = "",
  GOOGLE_AI_API_KEY = "",
  ANTHROPIC_API_KEY = "",
  DEFAULT_AI_PROVIDER = "google",
  DEFAULT_AI_MODEL = "",
  AI_TEMPERATURE = "0.7",
  AI_MAX_TOKENS = "4000",
  GOOGLE_CLIENT_ID = "",
  GOOGLE_CLIENT_SECRET = "",
  REDIRECT_URI = "",
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
  DATABASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI,
  // AI Configuration
  AI: {
    OPENAI_API_KEY,
    GOOGLE_AI_API_KEY,
    ANTHROPIC_API_KEY,
    DEFAULT_AI_PROVIDER,
    DEFAULT_AI_MODEL,
    AI_TEMPERATURE: parseFloat(AI_TEMPERATURE),
    AI_MAX_TOKENS: parseInt(AI_MAX_TOKENS),
  },
};
