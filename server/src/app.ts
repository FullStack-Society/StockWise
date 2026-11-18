import cors from "cors";
import express from "express";
import type { Pool } from "pg";
import type { AppConfig } from "./config/app-config.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createInventoryRouter } from "./routes/inventory.routes.js";
import { createOrganizationsRouter } from "./routes/organizations.routes.js";
import { createPurchaseOrdersRouter } from "./routes/purchase-orders.routes.js";
import { createReportsRouter } from "./routes/reports.routes.js";
import { createSalesRouter } from "./routes/sales.routes.js";
import { createSettingsRouter } from "./routes/settings.routes.js";

export function createApp(config: AppConfig, pool: Pool) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "X-Internal-API-Key",
        "X-User-Email",
        "X-Organization-ID",
        "X-Actor-Timestamp",
        "X-Actor-Signature",
      ],
    }),
  );
  app.use(express.json({ limit: "3mb" }));

  app.use("/api/auth", createAuthRouter(pool, config));
  app.get("/", (_req, res) => {
    res.json({
      name: config.appName,
      message: "Welcome to StockWise.",
      health: "/api/health/",
    });
  });

  app.use("/api/health", createHealthRouter(pool));

  app.use("/api/inventory", createInventoryRouter(pool, config));
  app.use("/api/orders", createPurchaseOrdersRouter(pool, config));
  app.use("/api/sales", createSalesRouter(pool, config));
  app.use("/api/organizations", createOrganizationsRouter(pool, config));
  app.use("/api/settings", createSettingsRouter(pool, config));
  app.use("/api/reports", createReportsRouter(pool, config));

  app.use((_req, res) => {
    res.status(404).json({ detail: "Not found." });
  });

  app.use(errorHandler);
  return app;
}
