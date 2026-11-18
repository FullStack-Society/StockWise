import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createPurchaseOrdersController } from "../controllers/purchase-orders.controller.js";

export function createPurchaseOrdersRouter(pool: Pool, config: AppConfig): Router {
  const router = Router();
  const controller = createPurchaseOrdersController(pool, config);

  router.use(...controller["USE 1"]!);
  router.get("/", ...controller["GET /"]!);
  router.get("/history", ...controller["GET /history"]!);
  router.post("/", ...controller["POST /"]!);
  router.put("/:order_id", ...controller["PUT /:order_id"]!);
  router.delete("/:order_id", ...controller["DELETE /:order_id"]!);
  router.post("/:order_id/items/:item_id/receive", ...controller["POST /:order_id/items/:item_id/receive"]!);

  return router;
}
