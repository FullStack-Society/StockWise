import * as model from "../models/health.js";
import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { asyncHandler } from "../utils/async-handler.js";

export function createHealthController(pool: Pool): RequestHandler {
  return asyncHandler(async (_req, res) => {
    await model.runDatabaseQueryQuery(pool, []);
    res.json({ status: "ok" });
  });
}
