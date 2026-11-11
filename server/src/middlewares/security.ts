import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { HttpError } from "./error-handler.js";
import type { OrganizationContext } from "../models/organization.js";

function headerString(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function requireInternalApiKey(config: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const supplied = headerString(req.headers["x-internal-api-key"]);
    const expectedBuffer = Buffer.from(config.internalApiKey);
    const suppliedBuffer = Buffer.from(supplied ?? "");

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      next(new HttpError(401, "Invalid or missing internal API key."));
      return;
    }
    next();
  };
}

export function requireSignedActor(config: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const email = headerString(req.headers["x-user-email"]);
    const timestamp = headerString(req.headers["x-actor-timestamp"]);
    const signature = headerString(req.headers["x-actor-signature"]);
    const issuedAt = Number(timestamp);

    if (
      !email ||
      !timestamp ||
      !signature ||
      !Number.isSafeInteger(issuedAt) ||
      Math.abs(Math.floor(Date.now() / 1000) - issuedAt) > 90
    ) {
      next(new HttpError(401, "Expired or invalid signed account context."));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const requestPath = new URL(req.originalUrl, "http://stockwise.internal")
      .pathname;
    const message = `${req.method}\n${requestPath}\n${normalizedEmail}\n${timestamp}`;
    const expected = createHmac("sha256", config.internalApiKey)
      .update(message)
      .digest();
    let supplied: Buffer;
    try {
      supplied = Buffer.from(signature, "hex");
    } catch {
      next(new HttpError(401, "Invalid signed account context."));
      return;
    }
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      next(new HttpError(401, "Invalid signed account context."));
      return;
    }

    req.actorEmail = normalizedEmail;
    next();
  };
}

export function requireOrganizationMembership(pool: Pool, config: AppConfig) {
  const requireKey = requireInternalApiKey(config);
  return async (req: Request, _res: Response, next: NextFunction) => {
    requireKey(req, _res, (keyError) => {
      if (keyError) {
        next(keyError);
        return;
      }

      void (async () => {
        const organizationHeader = headerString(
          req.headers["x-organization-id"],
        );
        const emailHeader = headerString(req.headers["x-user-email"]);
        const organizationId = Number(organizationHeader);
        const email = emailHeader?.trim().toLowerCase();

        if (
          !Number.isSafeInteger(organizationId) ||
          organizationId <= 0 ||
          !email
        ) {
          throw new HttpError(
            422,
            "A valid organization and account are required.",
          );
        }

        const result = await pool.query<{ role: string | null }>(
          "SELECT public.org_get_member_role($1, $2) AS role",
          [organizationId, email],
        );
        const role = result.rows[0]?.role;
        if (!role) {
          throw new HttpError(
            403,
            "You are not an active member of this organization.",
          );
        }

        req.organization = { organizationId, email, role };
        next();
      })().catch(next);
    });
  };
}
