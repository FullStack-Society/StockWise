import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../../src/config/app-config.js";
import { createSettingsController } from "../../src/controllers/settings.controller.js";

const config: AppConfig = {
  appName: "StockWise API",
  appEnv: "test",
  appPort: 0,
  clientUrl: "http://localhost:3000",
  databaseUrl: "postgresql://unused",
  internalApiKey: "a".repeat(32),
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  ownerName: "StockWise Owner",
};

test("security preference writes invoke database routines within the Node transaction", async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  let responseBody: unknown;
  let finish!: () => void;
  let fail!: (error: unknown) => void;
  const completed = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  const pool = {
    connect: async () => ({
      query: async (text: string, values?: unknown[]) => {
        queries.push({ text, values });
        if (text.startsWith("SELECT * FROM public.stockwise_settings_update")) {
          return {
            rows: [{ login_alert_emails: false, auto_sign_out_idle: true }],
          };
        }
        if (text === "COMMIT") finish();
        return { rows: [] };
      },
      release: () => undefined,
    }),
  } as unknown as Pool;
  const handler =
    createSettingsController(pool, config)[
      "PUT /security-privacy-preferences"
    ]![0]!;
  handler(
    {
      actorEmail: "person@example.com",
      body: { login_alert_emails: false, auto_sign_out_idle: true },
    } as never as Request,
    {
      json: (body: unknown) => {
        responseBody = body;
      },
    } as never as Response,
    (error?: unknown) => {
      if (error) fail(error);
    },
  );
  await completed;

  assert.deepEqual(responseBody, {
    login_alert_emails: false,
    auto_sign_out_idle: true,
  });
  assert.deepEqual(
    queries.map(({ text }) => text),
    [
      "BEGIN",
      "SELECT * FROM public.stockwise_settings_update_security_privacy_preferences($1, $2, $3)",
      "CALL public.stockwise_settings_clear_login_devices($1)",
      "COMMIT",
    ],
  );
  assert.deepEqual(queries[1]?.values, ["person@example.com", false, true]);
  assert.deepEqual(queries[2]?.values, ["person@example.com"]);
});
