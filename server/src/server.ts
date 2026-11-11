import { createApp } from "./app.js";
import { loadConfig } from "./config/app-config.js";
import { createPool } from "./config/database.js";
import { seedInitialOwner } from "./services/owner-provisioning.js";

const config = loadConfig();
const pool = createPool(config);
await seedInitialOwner(pool, config);
const app = createApp(config, pool);
const server = app.listen(config.appPort, () => {
  console.info(
    `[StockWise Node API] Listening on port ${config.appPort} (${config.appEnv}).`,
  );
});

async function shutdown(signal: string) {
  console.info(`[StockWise Node API] Received ${signal}; shutting down.`);
  server.close(async (error) => {
    try {
      await pool.end();
    } catch (poolError) {
      console.error("[StockWise Node API] Failed to close PostgreSQL pool:", poolError);
      process.exitCode = 1;
    }
    if (error) {
      console.error("[StockWise Node API] Failed to close HTTP server:", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
