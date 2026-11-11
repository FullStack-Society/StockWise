import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import type { OrganizationContext } from "../models/organization.js";

export type { Page, PageInput } from "../schemas/reports.schema.js";
export type {
  DailyStockMovementRow,
  ReportObject,
  UsageAnalyticsRow,
  YearlyStockMovementRow,
} from "../models/reports.js";

export type ReportRequest = Request & {
  organization: OrganizationContext;
};

export type ReportHandler = (
  req: ReportRequest,
  res: Response,
  client: PoolClient,
) => Promise<void>;
