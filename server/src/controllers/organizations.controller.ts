import {
  invitationReplySchema,
  inviteCreateSchema,
  memberRoleChangeSchema,
  organizationCreateSchema,
  organizationNameUpdateSchema,
  ownershipTransferSchema,
} from "../schemas/organizations.schema.js";
import {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { HttpError } from "../middlewares/error-handler.js";
import {
  requireInternalApiKey,
  requireOrganizationMembership,
} from "../middlewares/security.js";
import { requiredPathParam } from "../utils/request-params.js";
import type {
  OrganizationId,
  OrganizationRecord,
} from "../models/organizations.js";

type DbRow = OrganizationRecord;

function normalizedRole(value: unknown): unknown {
  return value === "admin" ? "manager" : value;
}

function organizationSummary(row: DbRow) {
  return {
    organization_id: Number(row.organization_id),
    organization_name: row.organization_name,
    role: normalizedRole(row.role),
  };
}

function queryValue(
  req: Request,
  res: Response,
  name: string,
  minimumLength = 3,
): string | null {
  const value = req.query[name];
  if (value === undefined) {
    res.status(422).json({
      detail: [
        {
          loc: ["query", name],
          msg: "Field required",
          type: "missing",
        },
      ],
    });
    return null;
  }
  if (typeof value !== "string") {
    res.status(422).json({
      detail: [
        {
          loc: ["query", name],
          msg: "Input should be a valid string",
          type: "string_type",
        },
      ],
    });
    return null;
  }
  if (value.length < minimumLength) {
    res.status(422).json({
      detail: [
        {
          loc: ["query", name],
          msg: `String should have at least ${minimumLength} characters`,
          type: "string_too_short",
        },
      ],
    });
    return null;
  }
  return value;
}

function integerPath(
  req: Request,
  res: Response,
  name: string,
): OrganizationId | null {
  const value = req.params[name];
  if (typeof value !== "string" || !/^[+-]?\d+$/.test(value)) {
    res.status(422).json({
      detail: [
        {
          loc: ["path", name],
          msg: "Input should be a valid integer, unable to parse string as an integer",
          type: "int_parsing",
        },
      ],
    });
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function databaseError(error: unknown): Error {
  if (error instanceof HttpError) return error;

  switch (sqlState(error)) {
    case "42501":
      return new HttpError(403, "You are not allowed to do that.");
    case "P0002":
      return new HttpError(404, "The account or invitation was not found.");
    case "23505":
      return new HttpError(
        409,
        "This invitation or membership already exists.",
      );
    case "22023":
      return new HttpError(422, "The request is invalid.");
    default: {
      const source =
        typeof error === "object" && error !== null ? error : undefined;
      const diagnostic =
        source && "diagnostic" in source ? source.diagnostic : undefined;
      const constraint =
        source && "constraint" in source
          ? source.constraint
          : typeof diagnostic === "object" &&
              diagnostic !== null &&
              "constraint_name" in diagnostic
            ? diagnostic.constraint_name
            : "unknown";
      console.error(
        "[StockWise Node API] Organization database request failed",
        JSON.stringify({
          sqlstate: sqlState(error) ?? "unknown",
          constraint: typeof constraint === "string" ? constraint : "unknown",
          error_type:
            error instanceof Error ? error.constructor.name : typeof error,
        }),
      );
      return new HttpError(500, "Unable to complete the organization request.");
    }
  }
}

async function withDatabaseError(
  next: NextFunction,
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    next(databaseError(error));
  }
}

function noContent(res: Response): void {
  res.status(204).end();
}

function notificationId(req: Request, res: Response): OrganizationId | null {
  return integerPath(req, res, "notification_id");
}

function invitationId(req: Request, res: Response): OrganizationId | null {
  return integerPath(req, res, "invitation_id");
}

function organizationId(req: Request, res: Response): OrganizationId | null {
  return integerPath(req, res, "organization_id");
}

export function createOrganizationsController(pool: Pool, config: AppConfig): Record<string, RequestHandler[]> {
  const handlers: Record<string, RequestHandler[]> = {};
  handlers["USE 1"] = [requireInternalApiKey(config)];

  const requireMembership = requireOrganizationMembership(pool, config);

  handlers["POST /presence/heartbeat"] = [requireMembership, async (req, res, next) => {
      await withDatabaseError(next, async () => {
        const context = req.organization!;
        await pool.query(
          "CALL public.stockwise_record_organization_presence($1, $2)",
          [context.organizationId, context.email],
        );
        noContent(res);
      });
    }];

  handlers["POST /member-login"] = [requireMembership, async (req, res, next) => {
    await withDatabaseError(next, async () => {
      const { organizationId, email, role } = req.organization!;
      if (role === "owner" || !["manager", "staff"].includes(role)) {
        noContent(res);
        return;
      }

      await pool.query(
        "CALL public.stockwise_notify_organization_member_login($1, $2, $3)",
        [organizationId, email, role],
      );
      noContent(res);
    });
  }];

  handlers["GET /login-notifications"] = [requireMembership, async (req, res, next) => {
      await withDatabaseError(next, async () => {
        const { organizationId, email, role } = req.organization!;
        if (role !== "owner" && role !== "manager") {
          res.json([]);
          return;
        }

        const result = await pool.query<DbRow>(
          `SELECT * FROM public.stockwise_get_organization_login_notifications($1, $2)`,
          [organizationId, email],
        );
        res.json(
          result.rows.map((row) => ({
            notification_id: Number(row.notification_id),
            organization_id: Number(row.organization_id),
            actor_name: row.actor_name,
            actor_role: normalizedRole(row.actor_role),
            created_at: row.created_at,
            read_at: row.read_at ?? null,
          })),
        );
      });
    }];

  handlers["PUT /login-notifications/:notification_id/read"] = [requireMembership, async (req, res, next) => {
      const id = notificationId(req, res);
      if (id === null) return;
      const context = req.organization!;
      if (context.role !== "owner" && context.role !== "manager") {
        res.status(403).json({
          detail: "You cannot access this notification.",
        });
        return;
      }

      await withDatabaseError(next, async () => {
        const result = await pool.query<{ p_marked: boolean }>(
          "CALL public.stockwise_mark_organization_login_notification_read($1, $2, $3, NULL)",
          [id, context.organizationId, context.email],
        );
        if (!result.rows[0]?.p_marked) {
          throw new HttpError(404, "Notification not found.");
        }
        noContent(res);
      });
    }];

  handlers["POST /"] = [async (req, res, next) => {
    const parsed = organizationCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    await withDatabaseError(next, async () => {
      const result = await pool.query<DbRow>(
        `SELECT * FROM public.org_create_organization($1, $2)`,
        [parsed.data.email, parsed.data.organization_name],
      );
      res.status(201).json(organizationSummary(result.rows[0]!));
    });
  }];

  handlers["GET /mine"] = [async (req, res, next) => {
    const email = queryValue(req, res, "email");
    if (email === null) return;
    await withDatabaseError(next, async () => {
      const result = await pool.query<DbRow>(
        `SELECT * FROM public.org_get_my_organizations($1)`,
        [email.trim().toLowerCase()],
      );
      res.json(result.rows.map(organizationSummary));
    });
  }];

  handlers["GET /notifications"] = [async (req, res, next) => {
    const email = queryValue(req, res, "email");
    if (email === null) return;
    await withDatabaseError(next, async () => {
      const result = await pool.query<DbRow>(
        `SELECT * FROM public.org_get_leave_notifications($1)`,
        [email.trim().toLowerCase()],
      );
      res.json(
        result.rows.map((row) => ({
          notification_id: Number(row.notification_id),
          organization_id: Number(row.organization_id),
          organization_name: row.organization_name,
          actor_email: row.actor_email,
          actor_name: row.actor_name,
          created_at: row.created_at,
          read_at: row.read_at ?? null,
        })),
      );
    });
  }];

  handlers["PUT /notifications/:notification_id/read"] = [async (req, res, next) => {
    const id = notificationId(req, res);
    if (id === null) return;
    const email = queryValue(req, res, "email");
    if (email === null) return;
    await withDatabaseError(next, async () => {
      const result = await pool.query<{ marked: boolean }>(
        `SELECT public.org_mark_leave_notification_read($1, $2) AS marked`,
        [id, email.trim().toLowerCase()],
      );
      if (!result.rows[0]?.marked) {
        throw new HttpError(404, "Notification was not found.");
      }
      noContent(res);
    });
  }];

  handlers["DELETE /notifications/:notification_id"] = [async (req, res, next) => {
    const id = notificationId(req, res);
    if (id === null) return;
    const email = queryValue(req, res, "email");
    if (email === null) return;
    await withDatabaseError(next, async () => {
      const result = await pool.query<{ deleted: boolean }>(
        `SELECT public.org_delete_leave_notification($1, $2) AS deleted`,
        [id, email.trim().toLowerCase()],
      );
      if (!result.rows[0]?.deleted) {
        throw new HttpError(404, "Notification was not found.");
      }
      noContent(res);
    });
  }];

  handlers["PUT /:organization_id"] = [async (req, res, next) => {
    const id = organizationId(req, res);
    if (id === null) return;
    const parsed = organizationNameUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const name = parsed.data.organization_name.trim();
    if (!name) {
      res.status(422).json({ detail: "Enter an organization name." });
      return;
    }

    await withDatabaseError(next, async () => {
      const result = await pool.query<DbRow>(
        `SELECT * FROM public.org_rename_organization($1, $2, $3)`,
        [id, parsed.data.actor_email, name],
      );
      if (!result.rows[0]) {
        throw new HttpError(404, "Organization not found.");
      }
      res.json(organizationSummary(result.rows[0]));
    });
  }];

  handlers["POST /:organization_id/transfer-ownership"] = [async (req, res, next) => {
      const id = organizationId(req, res);
      if (id === null) return;
      const parsed = ownershipTransferSchema.safeParse(req.body);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }

      await withDatabaseError(next, async () => {
        const result = await pool.query<{ transferred: boolean }>(
          `SELECT public.org_transfer_ownership($1, $2, $3) AS transferred`,
          [id, parsed.data.actor_email, parsed.data.target_email],
        );
        if (!result.rows[0]?.transferred) {
          throw new HttpError(404, "Organization member not found.");
        }
        noContent(res);
      });
    }];

  handlers["DELETE /:organization_id"] = [async (req, res, next) => {
    const id = organizationId(req, res);
    if (id === null) return;
    const actorEmail = queryValue(req, res, "actor_email");
    if (actorEmail === null) return;

    await withDatabaseError(next, async () => {
      const result = await pool.query<{ deleted: boolean }>(
        `SELECT public.org_delete_organization($1, $2) AS deleted`,
        [id, actorEmail.trim().toLowerCase()],
      );
      if (!result.rows[0]?.deleted) {
        throw new HttpError(404, "Organization not found.");
      }
      noContent(res);
    });
  }];

  handlers["GET /invitations"] = [async (req, res, next) => {
    const email = queryValue(req, res, "email");
    if (email === null) return;
    await withDatabaseError(next, async () => {
      const result = await pool.query<DbRow>(
        `SELECT * FROM public.org_get_pending_invitations($1)`,
        [email.trim().toLowerCase()],
      );
      res.json(
        result.rows.map((row) => ({
          invitation_id: Number(row.invitation_id),
          organization_id: Number(row.organization_id),
          organization_name: row.organization_name,
          role: normalizedRole(row.role),
          invited_by_email: row.invited_by_email,
          created_at: row.created_at,
        })),
      );
    });
  }];

  handlers["POST /invitations/:invitation_id/respond"] = [async (req, res, next) => {
    const id = invitationId(req, res);
    if (id === null) return;
    const parsed = invitationReplySchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    await withDatabaseError(next, async () => {
      const result = await pool.query<DbRow>(
        `SELECT * FROM public.org_respond_to_invitation($1, $2, $3)`,
        [id, parsed.data.email, parsed.data.accept],
      );
      const row = result.rows[0];
      res.json(
        row
          ? {
              organization_id:
                row.organization_id === null
                  ? null
                  : Number(row.organization_id),
              organization_name: row.organization_name ?? null,
              role: row.role === null ? null : normalizedRole(row.role),
            }
          : { organization_id: null, organization_name: null, role: null },
      );
    });
  }];

  handlers["GET /:organization_id/members"] = [async (req, res, next) => {
    const id = organizationId(req, res);
    if (id === null) return;
    const actorEmail = queryValue(req, res, "actor_email");
    if (actorEmail === null) return;

    await withDatabaseError(next, async () => {
      const members = await pool.query<DbRow>(
        `SELECT * FROM public.org_list_members($1, $2)`,
        [id, actorEmail.trim().toLowerCase()],
      );
      const presence = await pool.query<{ email: string; online: boolean }>(
        `SELECT * FROM public.stockwise_get_organization_member_presence($1)`,
        [id],
      );
      const onlineByEmail = new Map(
        presence.rows.map((row) => [row.email, row.online]),
      );
      res.json(
        members.rows.map((row) => ({
          email: row.email,
          full_name: row.full_name,
          role: normalizedRole(row.role),
          status: row.status,
          online_status:
            row.status === "Invited"
              ? null
              : onlineByEmail.get(String(row.email).toLowerCase())
                ? "Active"
                : "Offline",
          joined_at: row.joined_at ?? null,
        })),
      );
    });
  }];

  handlers["POST /:organization_id/invitations"] = [async (req, res, next) => {
    const id = organizationId(req, res);
    if (id === null) return;
    const parsed = inviteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    await withDatabaseError(next, async () => {
      const result = await pool.query<{ invitation_id: string | number }>(
        `SELECT public.org_invite_member($1, $2, $3, $4) AS invitation_id`,
        [id, parsed.data.actor_email, parsed.data.email, parsed.data.role],
      );
      res.status(201).json({
        invitation_id: Number(result.rows[0]!.invitation_id),
      });
    });
  }];

  handlers["DELETE /:organization_id/members/:email"] = [async (req, res, next) => {
    const id = organizationId(req, res);
    if (id === null) return;
    const actorEmail = queryValue(req, res, "actor_email");
    if (actorEmail === null) return;

    await withDatabaseError(next, async () => {
      const result = await pool.query<{ removed: boolean }>(
        `SELECT public.org_remove_member($1, $2, $3) AS removed`,
        [
          id,
          actorEmail.trim().toLowerCase(),
          requiredPathParam(req, "email").trim().toLowerCase(),
        ],
      );
      if (!result.rows[0]?.removed) {
        throw new HttpError(404, "Member or invitation not found.");
      }
      noContent(res);
    });
  }];

  handlers["POST /:organization_id/leave"] = [async (req, res, next) => {
    const id = organizationId(req, res);
    if (id === null) return;
    const email = queryValue(req, res, "email");
    if (email === null) return;

    await withDatabaseError(next, async () => {
      const result = await pool.query<{ left: boolean }>(
        `SELECT public.org_leave($1, $2) AS left`,
        [id, email.trim().toLowerCase()],
      );
      if (!result.rows[0]?.left) {
        throw new HttpError(404, "Organization membership not found.");
      }
      noContent(res);
    });
  }];

  handlers["PUT /:organization_id/members/:email/role"] = [async (req, res, next) => {
      const id = organizationId(req, res);
      if (id === null) return;
      const parsed = memberRoleChangeSchema.safeParse(req.body);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }

      await withDatabaseError(next, async () => {
        const result = await pool.query<{ changed: boolean }>(
          `SELECT public.org_change_member_role($1, $2, $3, $4) AS changed`,
          [
            id,
            parsed.data.actor_email,
            requiredPathParam(req, "email").trim().toLowerCase(),
            parsed.data.role,
          ],
        );
        if (!result.rows[0]?.changed) {
          throw new HttpError(404, "Organization member not found.");
        }
        noContent(res);
      });
    }];

  return handlers;

}