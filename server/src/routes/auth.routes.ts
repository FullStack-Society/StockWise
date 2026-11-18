import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createAuthController } from "../controllers/auth.controller.js";

export function createAuthRouter(pool: Pool, config: AppConfig): Router {
  const router = Router();
  const controller = createAuthController(pool, config);

  router.post("/register", ...controller["POST /register"]!);
  router.post("/register/check", ...controller["POST /register/check"]!);
  router.post("/register/resend", ...controller["POST /register/resend"]!);
  router.post("/register/verify", ...controller["POST /register/verify"]!);
  router.post("/login", ...controller["POST /login"]!);
  router.post("/verify-2fa", ...controller["POST /verify-2fa"]!);
  router.post("/google", ...controller["POST /google"]!);
  router.post("/google/register", ...controller["POST /google/register"]!);
  router.post("/forgot-password", ...controller["POST /forgot-password"]!);
  router.post("/reset-password", ...controller["POST /reset-password"]!);

  return router;
}
