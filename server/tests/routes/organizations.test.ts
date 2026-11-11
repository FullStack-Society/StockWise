import assert from "node:assert/strict";
import express from "express";
import { after, before, test } from "node:test";
import type { Pool } from "pg";
import type { AppConfig } from "../../src/config/app-config.js";
import { errorHandler } from "../../src/middlewares/error-handler.js";
import { createOrganizationsRouter } from "../../src/routes/organizations.routes.js";

const config: AppConfig = {
  appName: "StockWise API",
  appEnv: "test",
  appPort: 0,
  clientUrl: "http://localhost:3000",
  databaseUrl: "postgresql://unused",
  internalApiKey: "a".repeat(32),
  smtpHost: "smtp.example.test",
  smtpPort: 587,
  ownerName: "StockWise Owner",
};

const queries: Array<{ text: string; values?: unknown[] }> = [];
let failWithSqlState: string | undefined;
let server: ReturnType<ReturnType<typeof express>["listen"]>;
let baseUrl: string;

before(async () => {
  const pool = {
    query: async (text: string, values?: unknown[]) => {
      queries.push({ text, values });
      if (failWithSqlState) {
        throw Object.assign(new Error("database error"), {
          code: failWithSqlState,
        });
      }
      if (text.includes("org_get_member_role")) {
        return { rows: [{ role: "staff" }], rowCount: 1 };
      }
      if (text.includes("org_create_organization")) {
        return {
          rows: [
            {
              organization_id: 17,
              organization_name: "Acme",
              role: "owner",
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  } as unknown as Pool;

  const app = express();
  app.use(express.json());
  app.use("/api/organizations", createOrganizationsRouter(pool, config));
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}/api/organizations`;
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("all organization routes require the internal API key", async () => {
  const queryCount = queries.length;
  const response = await fetch(`${baseUrl}/mine?email=owner@example.com`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    detail: "Invalid or missing internal API key.",
  });
  assert.equal(queries.length, queryCount);
});

test("organization creation validates input and uses parameterized SQL", async () => {
  const invalid = await fetch(`${baseUrl}/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-api-key": config.internalApiKey,
    },
    body: JSON.stringify({ email: "not-an-email", organization_name: "Acme" }),
  });
  assert.equal(invalid.status, 422);

  const response = await fetch(`${baseUrl}/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-api-key": config.internalApiKey,
    },
    body: JSON.stringify({
      email: " OWNER@EXAMPLE.COM ",
      organization_name: "Acme",
    }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    organization_id: 17,
    organization_name: "Acme",
    role: "owner",
  });
  const call = queries.find((query) =>
    query.text.includes("org_create_organization"),
  );
  assert.ok(call);
  assert.deepEqual(call.values, ["owner@example.com", "Acme"]);
});

test("organization SQLSTATE errors retain their HTTP mapping", async () => {
  failWithSqlState = "42501";
  try {
    const response = await fetch(`${baseUrl}/8/transfer-ownership`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-api-key": config.internalApiKey,
      },
      body: JSON.stringify({
        actor_email: "owner@example.com",
        target_email: "member@example.com",
      }),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      detail: "You are not allowed to do that.",
    });
  } finally {
    failWithSqlState = undefined;
  }
});

test("member login notifications require membership and enforce role access", async () => {
  const headers = {
    "x-internal-api-key": config.internalApiKey,
    "x-organization-id": "17",
    "x-user-email": "staff@example.com",
  };
  const list = await fetch(`${baseUrl}/login-notifications`, { headers });
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), []);

  const mark = await fetch(`${baseUrl}/login-notifications/1/read`, {
    method: "PUT",
    headers,
  });
  assert.equal(mark.status, 403);
  assert.deepEqual(await mark.json(), {
    detail: "You cannot access this notification.",
  });
});
