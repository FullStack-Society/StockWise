import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createInventoryController } from "../controllers/inventory.controller.js";

export function createInventoryRouter(pool: Pool, config: AppConfig): Router {
  const router = Router();
  const controller = createInventoryController(pool, config);

  router.use(...controller["USE 1"]!);
  router.get("/movements", ...controller["GET /movements"]!);
  router.get("/", ...controller["GET /"]!);
  router.get("/alerts", ...controller["GET /alerts"]!);
  router.get("/categories/", ...controller["GET /categories/"]!);
  router.post("/categories/", ...controller["POST /categories/"]!);
  router.delete("/categories/:category_id", ...controller["DELETE /categories/:category_id"]!);
  router.get("/:product_id", ...controller["GET /:product_id"]!);
  router.post("/", ...controller["POST /"]!);
  router.put("/:product_id", ...controller["PUT /:product_id"]!);
  router.delete("/:product_id", ...controller["DELETE /:product_id"]!);
  router.post("/:product_id/movements", ...controller["POST /:product_id/movements"]!);
  router.post("/:product_id/stocktake", ...controller["POST /:product_id/stocktake"]!);

  return router;
}
