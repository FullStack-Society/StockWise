import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createReportsController } from "../controllers/reports.controller.js";

export function createReportsRouter(pool: Pool, config: AppConfig): Router {
  const router = Router();
  const controller = createReportsController(pool, config);

  router.use(...controller["USE 1"]!);
  router.post("/usage-analytics/page-view", ...controller["POST /usage-analytics/page-view"]!);
  router.get("/usage-analytics", ...controller["GET /usage-analytics"]!);
  router.get("/dashboard-stock-flow", ...controller["GET /dashboard-stock-flow"]!);
  router.get("/inventory", ...controller["GET /inventory"]!);

  return router;
}
