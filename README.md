## Express API (TypeScript)

Minimal, production-ready Express API starter written in TypeScript, with:

- **Environment-based configuration** via `.env` and `APP_SETTINGS`
- **Graceful shutdown** and process safety handlers
- **Clustered workers in production** for better CPU utilization
- **Health check endpoint** at `/health`
- **Versioned routing** under `/api/v1` and `/api/public/v1`
- **Static file hosting** from the `images` directory at `/static`

### Getting started

- **Requirements**: Node 18+ and npm (or pnpm/yarn)

```bash
git clone <this-repo>
cd express
npm install
cp .env.example .env
npm run dev
```

The server will start on the port defined in `APP_SETTINGS.PORT` (defaults to `3000`).

### Available npm scripts

- **`npm run dev`**: Start the API in development mode with `nodemon` + `esbuild-register`
- **`npm run start`**: Start the API (no autoreload, suitable for basic production runs)
- **`npm run build`**: Compile TypeScript with `tsc` into `dist`
- **`npm run format`**: Format the codebase with Prettier
- **`npm run lint`**: Check formatting with Prettier

### Environment variables

Configuration is centralized in `src/shared/app-settings.ts` and loaded from `.env`.

Key variables:

- **`NODE_ENV`**: `development` or `production`
- **`PORT`**: Port the HTTP server listens on (default `3000`)
- **`JWT_SECRET`**: Secret key for signing JWTs (required and must be non-default in production)
- **`JWT_EXPIRES_IN`**: JWT expiration (e.g. `7d`)
- **`ALLOWED_ORIGINS`**: Comma-separated list of allowed origins
- **`DATABASE_URL`**: Connection string for your database (required in production)

In production, the app will:

- Validate that **`JWT_SECRET`** and **`DATABASE_URL`** are set
- Reject the default `JWT_SECRET` value

### API & routing

- **Health check**: `GET /health`
  - Returns a JSON payload with status, timestamp, uptime, and environment.
- **Public API v1**: `router` mounted at `/api/public/v1` in `src/routes/v1/public-router.ts`
- **Authenticated/primary API v1**: `router` mounted at `/api/v1` in `src/routes/v1/router.ts`
- **Static files**: Served from the `images` directory at `/static`

Unmatched routes return a JSON `404` response:

- `success: false`
- `message: "Route not found"`
- `statusCode: 404`

Errors are centrally handled by the `errorHandler` middleware in `src/shared/middlewares/error-handler.middleware.ts`.

### Production behavior

When `NODE_ENV=production`:

- The app runs under a **clustered master/worker setup** (one worker per CPU core)
- Workers are automatically **respawned** if they exit
- **Graceful shutdown** is wired for `SIGTERM`, `SIGINT`, and `SIGUSR2`

This makes the template a solid starting point for real-world APIs that need resilience and structured configuration.
