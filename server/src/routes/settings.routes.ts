import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createSettingsController } from "../controllers/settings.controller.js";

export function createSettingsRouter(pool: Pool, config: AppConfig): Router {
  const router = Router();
  const controller = createSettingsController(pool, config);

  router.use(...controller["USE 1"]!);
  router.get("/security-privacy-preferences", ...controller["GET /security-privacy-preferences"]!);
  router.put("/security-privacy-preferences", ...controller["PUT /security-privacy-preferences"]!);
  router.get("/inventory-defaults", ...controller["GET /inventory-defaults"]!);
  router.put("/inventory-defaults", ...controller["PUT /inventory-defaults"]!);
  router.get("/security-status", ...controller["GET /security-status"]!);
  router.get("/usage-analytics-consent", ...controller["GET /usage-analytics-consent"]!);
  router.put("/usage-analytics-consent", ...controller["PUT /usage-analytics-consent"]!);
  router.get("/mfa", ...controller["GET /mfa"]!);
  router.post("/mfa/enroll", ...controller["POST /mfa/enroll"]!);
  router.post("/mfa/confirm", ...controller["POST /mfa/confirm"]!);
  router.post("/mfa/disable", ...controller["POST /mfa/disable"]!);
  router.get("/", ...controller["GET /"]!);
  router.put("/profile", ...controller["PUT /profile"]!);
  router.put("/avatar", ...controller["PUT /avatar"]!);
  router.put("/preferences", ...controller["PUT /preferences"]!);
  router.put("/password", ...controller["PUT /password"]!);
  router.delete("/account", ...controller["DELETE /account"]!);

  return router;
}
