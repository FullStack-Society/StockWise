import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createOrganizationsController } from "../controllers/organizations.controller.js";

export function createOrganizationsRouter(pool: Pool, config: AppConfig): Router {
  const router = Router();
  const controller = createOrganizationsController(pool, config);

  router.use(...controller["USE 1"]!);
  router.post("/presence/heartbeat", ...controller["POST /presence/heartbeat"]!);
  router.post("/member-login", ...controller["POST /member-login"]!);
  router.get("/login-notifications", ...controller["GET /login-notifications"]!);
  router.put("/login-notifications/:notification_id/read", ...controller["PUT /login-notifications/:notification_id/read"]!);
  router.post("/", ...controller["POST /"]!);
  router.get("/mine", ...controller["GET /mine"]!);
  router.get("/notifications", ...controller["GET /notifications"]!);
  router.put("/notifications/:notification_id/read", ...controller["PUT /notifications/:notification_id/read"]!);
  router.delete("/notifications/:notification_id", ...controller["DELETE /notifications/:notification_id"]!);
  router.put("/:organization_id", ...controller["PUT /:organization_id"]!);
  router.post("/:organization_id/transfer-ownership", ...controller["POST /:organization_id/transfer-ownership"]!);
  router.delete("/:organization_id", ...controller["DELETE /:organization_id"]!);
  router.get("/invitations", ...controller["GET /invitations"]!);
  router.post("/invitations/:invitation_id/respond", ...controller["POST /invitations/:invitation_id/respond"]!);
  router.get("/:organization_id/members", ...controller["GET /:organization_id/members"]!);
  router.post("/:organization_id/invitations", ...controller["POST /:organization_id/invitations"]!);
  router.delete("/:organization_id/members/:email", ...controller["DELETE /:organization_id/members/:email"]!);
  router.post("/:organization_id/leave", ...controller["POST /:organization_id/leave"]!);
  router.put("/:organization_id/members/:email/role", ...controller["PUT /:organization_id/members/:email/role"]!);

  return router;
}
