import * as dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });
import http from "http";
import app from "./express-app";
import { APP_SETTINGS } from "./shared/app-settings";
import { logger } from "./shared/logger/logger";
import { socketManager } from "./shared/socket";
import { checkDBConnection } from "./shared/db/db";
async function main() {
  const server = http.createServer(app);
  socketManager.initialize(server);
  await checkDBConnection();
  server.listen(APP_SETTINGS.PORT, () => {
    const { NODE_ENV, PORT } = APP_SETTINGS;
    const msg = `${NODE_ENV.toUpperCase()} server started at port ${PORT}`;
    logger.log(msg);
  });
}
main();
