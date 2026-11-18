import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createSalesController } from "../controllers/sales.controller.js";
import { requireOrganizationMembership } from "../middlewares/security.js";

export function createSalesRouter(pool: Pool, config: AppConfig): Router {
  const router = Router();
  const controller = createSalesController(pool);

  const membership = requireOrganizationMembership(pool, config);
  router.get("/merchant-qr", membership, controller.getMerchantQr);
  router.put("/merchant-qr", membership, controller.updateMerchantQr);
  router.post("/", membership, controller.checkout);

  return router;
}
