import * as transactionModel from "../models/transaction.js";
import * as model from "../models/reports.js";
import { pageSchema } from "../schemas/reports.schema.js";
import {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { Pool, PoolClient } from "pg";

import { ZodError } from "zod";
import type { AppConfig } from "../config/app-config.js";
import { HttpError } from "../middlewares/error-handler.js";
import { requireOrganizationMembership } from "../middlewares/security.js";
import type { OrganizationContext } from "../types/organization.js";
import type {
  DailyStockMovementRow,
  ReportObject,
  UsageAnalyticsRow,
} from "../types/reports.js";

type ReportRequest = Request & { organization: OrganizationContext };
type ReportHandler = (
  req: ReportRequest,
  res: Response,
  client: PoolClient,
) => Promise<void>;

async function transaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await transactionModel.begin(client);
    const result = await operation(client);
    await transactionModel.commit(client);
    return result;
  } catch (error) {
    try {
      await transactionModel.rollback(client);
    } catch {
      // Preserve the original request error.
    }
    throw error;
  } finally {
    client.release();
  }
}

function route(
  pool: Pool,
  errorMessage: string,
  handler: ReportHandler,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void transaction(pool, (client) =>
      handler(req as ReportRequest, res, client),
    ).catch((error: unknown) => {
      if (error instanceof HttpError || error instanceof ZodError) next(error);
      else next(new HttpError(503, errorMessage));
    });
  };
}

function queryInteger(
  req: Request,
  key: string,
  defaultValue: number,
  minimum?: number,
  maximum?: number,
): number {
  const raw = req.query[key];
  if (raw === undefined) return defaultValue;
  if (typeof raw !== "string" || !/^[+-]?\d+$/.test(raw)) {
    throw new HttpError(422, `Invalid value for query parameter '${key}'.`);
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    (minimum !== undefined && value < minimum) ||
    (maximum !== undefined && value > maximum)
  ) {
    throw new HttpError(422, `Invalid value for query parameter '${key}'.`);
  }
  return value;
}

function organization(req: ReportRequest): OrganizationContext {
  if (!req.organization) {
    throw new HttpError(
      403,
      "You are not an active member of this organization.",
    );
  }
  return req.organization;
}

async function userTimezone(
  client: PoolClient,
  email: string,
): Promise<string> {
  const result = await model.runGetUserTimezoneQuery(client, [
    email.trim().toLowerCase(),
  ]);
  const timezone = result.rows[0]?.timezone;
  const supported = new Set([
    "Asia/Manila",
    "Asia/Singapore",
    "America/Los_Angeles",
    "America/Chicago",
    "America/New_York",
    "Europe/London",
    "Europe/Berlin",
    "UTC",
  ]);
  return supported.has(timezone) ? timezone : "Asia/Manila";
}

function jsonObject(value: unknown): ReportObject {
  if (typeof value === "string") return JSON.parse(value) as ReportObject;
  if (value && typeof value === "object") return value as ReportObject;
  throw new Error("The report database function returned an invalid result.");
}

async function inventoryReport(
  client: PoolClient,
  organizationId: number,
  days: number,
  timezone: string,
  offset: number,
  yearOffset: number,
): Promise<ReportObject> {
  const baseResult = await model.runGetInventoryReportQuery(client, [
    organizationId,
    days,
    timezone,
  ]);
  const report = jsonObject(baseResult.rows[0]?.report);

  const salesTotals = await model.runGetSalesReportTotalsQuery(client, [
    organizationId,
    days,
    timezone,
  ]);
  Object.assign(report, salesTotals.rows[0]);

  const revenueTotals = await model.runGetSalesRevenueTotalsQuery(client, [
    organizationId,
    days,
    timezone,
  ]);
  Object.assign(report, revenueTotals.rows[0]);

  const dailyMovement =
    await model.runGetDailyInventoryMovementQuery<DailyStockMovementRow>(
      client,
      [organizationId, days, offset, timezone],
    );
  report.daily_movement = dailyMovement.rows;

  const yearlyMovement = await model.runGetYearlyInventoryMovementQuery(
    client,
    [organizationId, yearOffset, timezone],
  );
  report.yearly_movement = yearlyMovement.rows;

  const monthlyTotals = await model.runGetMonthlyInventoryMovementTotalsQuery(
    client,
    [organizationId, timezone],
  );
  const reorderSummary = await model.runGetReorderSummaryQuery(client, [
    organizationId,
  ]);
  const summary = jsonObject(reorderSummary.rows[0]?.summary);
  Object.assign(report, {
    low_stock_count: summary.low_stock_count,
    critical_count: summary.critical_count,
    monthly_transaction_count: monthlyTotals.rows[0]?.transaction_count,
    monthly_units_received: monthlyTotals.rows[0]?.units_received,
    monthly_units_issued: monthlyTotals.rows[0]?.units_issued,
  });
  return report;
}

export function createReportsController(
  pool: Pool,
  config: AppConfig,
): Record<string, RequestHandler[]> {
  const handlers: Record<string, RequestHandler[]> = {};
  handlers["USE 1"] = [requireOrganizationMembership(pool, config)];

  handlers["POST /usage-analytics/page-view"] = [
    route(
      pool,
      "Unable to record anonymous usage data.",
      async (req, res, client) => {
        const { page } = pageSchema.parse(req.body);
        const member = organization(req);
        await model.runRecordUsagePageViewQuery(client, [
          member.organizationId,
          page,
          member.email.trim().toLowerCase(),
        ]);
        res.status(204).end();
      },
    ),
  ];
  handlers["GET /usage-analytics"] = [
    route(pool, "Unable to load usage analytics.", async (req, res, client) => {
      const days = queryInteger(req, "days", 30, 7, 90);
      const member = organization(req);
      if (member.role === "staff") {
        throw new HttpError(
          403,
          "Usage analytics are available to Owners and Managers.",
        );
      }
      const result = await model.runGetUsageAnalyticsQuery<UsageAnalyticsRow>(
        client,
        [member.organizationId, days],
      );
      const byPage = result.rows;
      res.json({
        days,
        total_views: byPage.reduce(
          (total: number, row: UsageAnalyticsRow) => total + Number(row.views),
          0,
        ),
        by_page: byPage,
      });
    }),
  ];
  handlers["GET /dashboard-stock-flow"] = [
    route(
      pool,
      "Unable to load daily stock flow.",
      async (req, res, client) => {
        const days = queryInteger(req, "days", 7);
        if (![7, 14, 30].includes(days)) {
          throw new HttpError(422, "days must be 7, 14 or 30.");
        }
        const member = organization(req);
        const timezone = await userTimezone(client, member.email);
        const result = await model.runGetDashboardStockFlowQuery(client, [
          member.organizationId,
          days,
          timezone,
        ]);
        res.json(jsonObject(result.rows[0]?.report));
      },
    ),
  ];
  handlers["GET /inventory"] = [
    route(
      pool,
      "Unable to load inventory reports.",
      async (req, res, client) => {
        const days = queryInteger(req, "days", 365);
        const offset = queryInteger(req, "offset", 0, 0, 100);
        const yearOffset = queryInteger(req, "year_offset", 0, 0, 3);
        if (![30, 90, 365].includes(days)) {
          throw new HttpError(422, "days must be 30, 90 or 365.");
        }
        const member = organization(req);
        if (member.role === "staff") {
          throw new HttpError(
            403,
            "Reports are available to Owners and Managers.",
          );
        }
        const timezone = await userTimezone(client, member.email);
        res.json(
          await inventoryReport(
            client,
            member.organizationId,
            days,
            timezone,
            offset,
            yearOffset,
          ),
        );
      },
    ),
  ];

  return handlers;
}
