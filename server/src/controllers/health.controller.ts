import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { asyncHandler } from "../utils/async-handler.js";

export function createHealthController(pool: Pool): RequestHandler {
  return asyncHandler(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  });
}
