import {
  avatarSchema,
  codeSchema,
  consentSchema,
  inventoryDefaultsSchema,
  passwordSchema,
  preferencesSchema,
  profileSchema,
  securityPreferencesSchema,
} from "../schemas/settings.schema.js";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  pbkdf2,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  type NextFunction,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import type { Pool, PoolClient } from "pg";
import { ZodError } from "zod";
import type { AppConfig } from "../config/app-config.js";
import { HttpError } from "../middlewares/error-handler.js";
import { requireInternalApiKey } from "../middlewares/security.js";
import type { SettingsHandler, SettingsRequest } from "../types/settings.js";

const pbkdf2Async = promisify(pbkdf2);

async function transaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original request error.
    }
    throw error;
  } finally {
    client.release();
  }
}

function requireSettingsActor(config: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const emailHeader = req.headers["x-user-email"];
    const timestampHeader = req.headers["x-actor-timestamp"];
    const signatureHeader = req.headers["x-actor-signature"];
    const email = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader;
    const timestamp = Array.isArray(timestampHeader)
      ? timestampHeader[0]
      : timestampHeader;
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    if (!email || email.length < 3 || !timestamp || !signature) {
      next(new HttpError(422, "Invalid signed account context."));
      return;
    }
    if (!/^[+-]?\d+$/.test(timestamp)) {
      next(new HttpError(401, "Invalid signed account context."));
      return;
    }

    const issuedAt = Number(timestamp);
    if (
      !Number.isSafeInteger(issuedAt) ||
      Math.abs(Math.floor(Date.now() / 1000) - issuedAt) > 90
    ) {
      next(new HttpError(401, "Expired signed account context."));
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const path = req.originalUrl.split("?")[0] ?? req.path;
    const message = `${req.method}\n${path}\n${normalizedEmail}\n${timestamp}`;
    const expected = createHmac("sha256", config.internalApiKey)
      .update(message)
      .digest();
    if (!/^[0-9a-f]{64}$/.test(signature)) {
      next(new HttpError(401, "Invalid signed account context."));
      return;
    }
    const supplied = Buffer.from(signature, "hex");
    if (!timingSafeEqual(supplied, expected)) {
      next(new HttpError(401, "Invalid signed account context."));
      return;
    }
    (req as SettingsRequest).actorEmail = normalizedEmail;
    next();
  };
}

function route(
  pool: Pool,
  errorMessage: string,
  handler: SettingsHandler,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void transaction(pool, (client) =>
      handler(req as SettingsRequest, res, client),
    ).catch((error: unknown) => {
      if (error instanceof HttpError || error instanceof ZodError) {
        next(error);
      } else {
        next(new HttpError(503, errorMessage));
      }
    });
  };
}

function parseAvatar(value: string | null): string | null {
  if (value === null) return null;
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    );
  if (!match) throw new HttpError(422, "Use a JPEG, PNG, or WebP image.");
  const encoded = match[2]!;
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded || bytes.length > 650_000) {
    throw new HttpError(
      422,
      bytes.length > 650_000
        ? "The resized image must be 650 KB or smaller."
        : "The image data is invalid.",
    );
  }
  const validSignature =
    match[1] === "image/jpeg"
      ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : match[1] === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(
              Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            )
        : bytes.length >= 12 &&
          bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
          bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!validSignature) {
    throw new HttpError(422, "The image data does not match its file type.");
  }
  return value;
}

function fernetKeys(config: AppConfig): Buffer[] {
  const keys: Buffer[] = [];
  const configured = process.env.TOTP_ENCRYPTION_KEYS;
  if (configured) {
    for (const raw of configured.split(",")) {
      const key = raw.trim();
      if (key) {
        const decoded = Buffer.from(key, "base64url");
        const unpadded = key.replace(/=+$/, "");
        if (
          !/^[A-Za-z0-9_-]+={0,2}$/.test(key) ||
          decoded.length !== 32 ||
          decoded.toString("base64url") !== unpadded
        ) {
          throw new Error(
            "TOTP_ENCRYPTION_KEYS must contain valid URL-safe Fernet keys.",
          );
        }
        keys.push(decoded);
      }
    }
  }
  if (config.internalApiKey.length >= 32) {
    const legacyBytes = createHash("sha256")
      .update(config.internalApiKey + "|stockwise-totp-secret-v1")
      .digest();
    if (!keys.some((key) => key.equals(legacyBytes))) keys.push(legacyBytes);
  } else if (keys.length === 0) {
    throw new Error(
      "Two-factor authentication requires TOTP_ENCRYPTION_KEYS or a configured internal API key.",
    );
  }
  if (keys.length === 0) {
    throw new Error(
      "Two-factor authentication requires TOTP_ENCRYPTION_KEYS or a configured internal API key.",
    );
  }
  return keys;
}

function encryptSecret(secret: string, config: AppConfig): string {
  const key = fernetKeys(config)[0]!;
  const timestamp = Buffer.alloc(8);
  timestamp.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-128-cbc", key.subarray(16), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "ascii"),
    cipher.final(),
  ]);
  const payload = Buffer.concat([
    Buffer.from([0x80]),
    timestamp,
    iv,
    ciphertext,
  ]);
  const signature = createHmac("sha256", key.subarray(0, 16))
    .update(payload)
    .digest();
  return Buffer.concat([payload, signature]).toString("base64url");
}

function decryptSecret(
  ciphertext: string | null | undefined,
  config: AppConfig,
): string {
  if (!ciphertext) throw new HttpError(400, "That code is invalid.");
  let token: Buffer;
  try {
    token = Buffer.from(ciphertext, "base64url");
  } catch {
    throw new Error(
      "The authenticator secret cannot be decrypted. Check the internal API key.",
    );
  }
  for (const key of fernetKeys(config)) {
    if (token.length < 73 || token[0] !== 0x80) continue;
    const payload = token.subarray(0, -32);
    const supplied = token.subarray(-32);
    const expected = createHmac("sha256", key.subarray(0, 16))
      .update(payload)
      .digest();
    if (!timingSafeEqual(supplied, expected)) continue;
    try {
      const decipher = createDecipheriv(
        "aes-128-cbc",
        key.subarray(16),
        token.subarray(9, 25),
      );
      return Buffer.concat([
        decipher.update(token.subarray(25, -32)),
        decipher.final(),
      ]).toString("ascii");
    } catch {
      break;
    }
  }
  throw new Error(
    "The authenticator secret cannot be decrypted. Check the internal API key.",
  );
}

function newTotpSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const input = randomBytes(20);
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of input) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += alphabet[(buffer >>> bits) & 31];
    }
  }
  if (bits > 0) output += alphabet[(buffer << (5 - bits)) & 31];
  return output;
}

function totp(secret: string, timestamp: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of secret) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("Invalid authenticator secret.");
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 30)));
  const digest = createHmac("sha1", Buffer.from(bytes))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return binary.toString().padStart(6, "0");
}

function matchingTotpStep(secret: string, code: string): number | null {
  const normalized = code.replace(/[^\p{Nd}]/gu, "");
  if (normalized.length !== 6) return null;
  const now = Math.floor(Date.now() / 1000);
  for (const step of [
    Math.floor(now / 30) - 1,
    Math.floor(now / 30),
    Math.floor(now / 30) + 1,
  ]) {
    const actual = Buffer.from(totp(secret, step * 30));
    const supplied = Buffer.from(normalized);
    if (
      supplied.length === actual.length &&
      timingSafeEqual(supplied, actual)
    ) {
      return step;
    }
  }
  return null;
}

function recoveryHash(code: string): string | null {
  const normalized = code.replace(/-/g, "").trim().toUpperCase();
  if (!/^[\x00-\x7f]*$/.test(normalized)) return null;
  return createHash("sha256").update(normalized, "ascii").digest("hex");
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const digest = (await pbkdf2Async(
    password,
    salt,
    600_000,
    32,
    "sha256",
  )) as Buffer;
  return `pbkdf2_sha256$600000$${salt.toString("hex")}$${digest.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split("$");
  if (
    parts.length !== 4 ||
    parts[0] !== "pbkdf2_sha256" ||
    parts[1] !== "600000" ||
    !/^[0-9a-f]{32}$/i.test(parts[2] ?? "") ||
    !/^[0-9a-f]{64}$/i.test(parts[3] ?? "")
  ) {
    return false;
  }
  const actual = (await pbkdf2Async(
    password,
    Buffer.from(parts[2]!, "hex"),
    600_000,
    32,
    "sha256",
  )) as Buffer;
  const expected = Buffer.from(parts[3]!, "hex");
  return timingSafeEqual(actual, expected);
}

export function createSettingsController(pool: Pool, config: AppConfig): Record<string, RequestHandler[]> {
  const handlers: Record<string, RequestHandler[]> = {};
  handlers["USE 1"] = [requireInternalApiKey(config), requireSettingsActor(config)];

  handlers["GET /security-privacy-preferences"] = [route(
      pool,
      "Unable to load security preferences.",
      async (req, res, client) => {
        const email = req.actorEmail;
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_get_security_privacy_preferences($1)",
          [email],
        );
        res.json(result.rows[0]);
      },
    )];
  handlers["PUT /security-privacy-preferences"] = [route(
      pool,
      "Unable to save security preferences.",
      async (req, res, client) => {
        const preferences = securityPreferencesSchema.parse(req.body);
        const email = req.actorEmail;
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_update_security_privacy_preferences($1, $2, $3)",
          [
            email,
            preferences.login_alert_emails,
            preferences.auto_sign_out_idle,
          ],
        );
        if (!preferences.login_alert_emails) {
          await client.query(
            "CALL public.stockwise_settings_clear_login_devices($1)",
            [email],
          );
        }
        res.json(result.rows[0]);
      },
    )];
  handlers["GET /inventory-defaults"] = [route(
      pool,
      "Unable to load inventory defaults.",
      async (req, res, client) => {
        const email = req.actorEmail;
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_get_inventory_defaults($1)",
          [email],
        );
        res.json(result.rows[0]);
      },
    )];
  handlers["PUT /inventory-defaults"] = [route(
      pool,
      "Unable to save inventory defaults.",
      async (req, res, client) => {
        const { default_reorder_point: value } = inventoryDefaultsSchema.parse(
          req.body,
        );
        const email = req.actorEmail;
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_update_inventory_defaults($1, $2)",
          [email, value],
        );
        res.json(result.rows[0]);
      },
    )];
  handlers["GET /security-status"] = [route(
      pool,
      "Unable to load account security status.",
      async (req, res, client) => {
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_get_security_status($1)",
          [req.actorEmail],
        );
        res.json({
          two_factor_enabled: Boolean(result.rows[0]?.two_factor_enabled),
          google_account_connected: Boolean(
            result.rows[0]?.google_account_connected,
          ),
        });
      },
    )];
  handlers["GET /usage-analytics-consent"] = [route(
      pool,
      "Unable to load analytics preference.",
      async (req, res, client) => {
        const email = req.actorEmail;
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_get_usage_analytics_consent($1)",
          [email],
        );
        res.json({ enabled: Boolean(result.rows[0]?.enabled) });
      },
    )];
  handlers["PUT /usage-analytics-consent"] = [route(
      pool,
      "Unable to save analytics preference.",
      async (req, res, client) => {
        const { enabled } = consentSchema.parse(req.body);
        const email = req.actorEmail;
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_update_usage_analytics_consent($1, $2)",
          [email, enabled],
        );
        res.json({ enabled: Boolean(result.rows[0]?.usage_analytics) });
      },
    )];
  handlers["GET /mfa"] = [route(pool, "Unable to load security status.", async (req, res, client) => {
      const result = await client.query(
        "SELECT enabled FROM public.stockwise_auth_mfa_get($1)",
        [req.actorEmail],
      );
      res.json({ enabled: Boolean(result.rows[0]?.enabled) });
    })];
  handlers["POST /mfa/enroll"] = [route(
      pool,
      "Unable to begin setup right now.",
      async (req, res, client) => {
        const email = req.actorEmail;
        const current = await client.query(
          "SELECT enabled FROM public.stockwise_auth_mfa_get($1)",
          [email],
        );
        if (current.rows[0]?.enabled) {
          throw new HttpError(
            409,
            "Two-factor authentication is already enabled.",
          );
        }
        let secret: string;
        let encrypted: string;
        try {
          secret = newTotpSecret();
          encrypted = encryptSecret(secret, config);
        } catch (error) {
          throw new HttpError(
            503,
            error instanceof Error
              ? error.message
              : "Two-factor setup is unavailable.",
          );
        }
        await client.query("SELECT public.stockwise_auth_mfa_begin($1, $2)", [
          email,
          encrypted,
        ]);
        const account = encodeQueryComponent(email);
        const issuer = encodeQueryComponent("StockWise");
        res.json({
          secret,
          otpauth_uri: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
        });
      },
    )];
  handlers["POST /mfa/confirm"] = [route(
      pool,
      "Unable to enable two-factor authentication.",
      async (req, res, client) => {
        const { code } = codeSchema.parse(req.body);
        const email = req.actorEmail;
        const result = await client.query(
          "SELECT pending_secret_ciphertext FROM public.stockwise_auth_mfa_get($1)",
          [email],
        );
        let secret: string;
        try {
          secret = decryptSecret(
            result.rows[0]?.pending_secret_ciphertext,
            config,
          );
        } catch (error) {
          if (error instanceof HttpError) {
            throw new HttpError(
              400,
              "That code is invalid. Try the current code from your authenticator app.",
            );
          }
          throw new HttpError(
            503,
            error instanceof Error
              ? error.message
              : "Unable to enable two-factor authentication.",
          );
        }
        const step = matchingTotpStep(secret, code);
        if (step === null) {
          throw new HttpError(
            400,
            "That code is invalid. Try the current code from your authenticator app.",
          );
        }
        const recoveryCodes = Array.from({ length: 10 }, () =>
          randomBytes(4).toString("hex").toUpperCase(),
        );
        const hashes = recoveryCodes.map((value) =>
          createHash("sha256").update(value, "ascii").digest("hex"),
        );
        const encrypted = encryptSecret(secret, config);
        await client.query(
          "SELECT public.stockwise_auth_mfa_enable($1, $2, $3::text[], $4)",
          [email, encrypted, hashes, step],
        );
        res.json({
          recovery_codes: recoveryCodes.map(
            (value) => `${value.slice(0, 4)}-${value.slice(4)}`,
          ),
        });
      },
    )];
  handlers["POST /mfa/disable"] = [route(
      pool,
      "Unable to disable two-factor authentication.",
      async (req, res, client) => {
        const { code } = codeSchema.parse(req.body);
        const email = req.actorEmail;
        const current = await client.query(
          "SELECT secret_ciphertext, enabled FROM public.stockwise_auth_mfa_get($1)",
          [email],
        );
        if (!current.rows[0]?.enabled) {
          throw new HttpError(
            400,
            "Enter a valid authenticator code to disable two-factor authentication.",
          );
        }
        let secret: string;
        try {
          secret = decryptSecret(current.rows[0].secret_ciphertext, config);
        } catch (error) {
          if (error instanceof HttpError) {
            throw new HttpError(
              400,
              "Enter a valid authenticator code to disable two-factor authentication.",
            );
          }
          throw new HttpError(
            503,
            error instanceof Error
              ? error.message
              : "Unable to disable two-factor authentication.",
          );
        }
        const allowed = await client.query(
          "SELECT public.stockwise_auth_mfa_disable_allowed($1) AS allowed",
          [email],
        );
        if (!allowed.rows[0]?.allowed) {
          throw new HttpError(
            400,
            "Enter a valid authenticator code to disable two-factor authentication.",
          );
        }
        const step = matchingTotpStep(secret, code);
        let valid = false;
        if (step !== null) {
          const accepted = await client.query(
            "SELECT public.stockwise_auth_mfa_accept_totp($1, $2) AS accepted",
            [email, step],
          );
          valid = Boolean(accepted.rows[0]?.accepted);
        }
        if (!valid) {
          const codeHash = recoveryHash(code);
          if (codeHash) {
            const consumed = await client.query(
              "SELECT public.stockwise_auth_mfa_recovery_consume($1, $2) AS consumed",
              [email, codeHash],
            );
            valid = Boolean(consumed.rows[0]?.consumed);
          }
        }
        if (!valid) {
          await client.query(
            "SELECT public.stockwise_auth_mfa_disable_fail($1)",
            [email],
          );
          res.status(400).json({
            detail:
              "Enter a valid authenticator code to disable two-factor authentication.",
          });
          return;
        }
        await client.query("SELECT public.stockwise_auth_mfa_disable($1)", [
          email,
        ]);
        res.status(204).end();
      },
    )];
  handlers["GET /"] = [route(
      pool,
      "Unable to load account settings.",
      async (req, res, client) => {
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_get_account($1)",
          [req.actorEmail],
        );
        if (!result.rows[0]) throw new HttpError(404, "Account not found.");
        res.json(result.rows[0]);
      },
    )];
  handlers["PUT /profile"] = [route(
      pool,
      "Unable to save profile settings.",
      async (req, res, client) => {
        const request = profileSchema.parse(req.body);
        const name = request.name.trim();
        if (!name) throw new HttpError(422, "Enter your name.");
        const result = await client.query(
          `SELECT * FROM public.stockwise_settings_update_profile($1, $2, $3)`,
          [req.actorEmail, name, request.timezone.trim()],
        );
        if (!result.rows[0]) throw new HttpError(404, "Account not found.");
        res.json({ ...result.rows[0], avatar_data: null });
      },
    )];
  handlers["PUT /avatar"] = [route(pool, "Unable to save profile image.", async (req, res, client) => {
      const request = avatarSchema.parse(req.body);
      const avatarData = parseAvatar(request.avatar_data);
      const email = req.actorEmail;
      const result = await client.query(
        "SELECT * FROM public.stockwise_settings_update_avatar($1, $2)",
        [email, avatarData],
      );
      res.json(result.rows[0]);
    })];
  handlers["PUT /preferences"] = [route(pool, "Unable to save preferences.", async (req, res, client) => {
      const request = preferencesSchema.parse(req.body);
      const result = await client.query(
        `SELECT * FROM public.stockwise_settings_update_preferences(
          $1, $2, $3, $4, $5, $6, $7, $8
        )`,
        [
          req.actorEmail,
          request.invitation_notifications,
          request.theme,
          request.date_format,
          request.currency,
          request.density,
          request.auto_sync_reports,
          request.prioritize_low_stock,
        ],
      );
      if (!result.rows[0]) throw new HttpError(404, "Account not found.");
      res.json({ ...result.rows[0], avatar_data: null });
    })];
  handlers["PUT /password"] = [route(pool, "Unable to update your password.", async (req, res, client) => {
      const request = passwordSchema.parse(req.body);
      const email = req.actorEmail;
      const result = await client.query(
        "SELECT * FROM public.stockwise_settings_get_password_account($1)",
        [email],
      );
      const account = result.rows[0];
      if (!account) throw new HttpError(404, "Account not found.");
      if (
        !(await verifyPassword(request.current_password, account.password_hash))
      ) {
        throw new HttpError(400, "Current password is incorrect.");
      }
      if (request.current_password === request.new_password) {
        throw new HttpError(
          422,
          "Choose a new password different from your current password.",
        );
      }
      const updated = await client.query(
        "SELECT public.stockwise_settings_update_password($1, $2, $3) AS updated",
        [
          email,
          account.account_table,
          await passwordHash(request.new_password),
        ],
      );
      if (!updated.rows[0]?.updated)
        throw new HttpError(404, "Account not found.");
      res.status(204).end();
    })];
  handlers["DELETE /account"] = [route(
      pool,
      "Unable to delete this account right now.",
      async (req, res, client) => {
        const result = await client.query(
          "SELECT * FROM public.stockwise_settings_delete_account($1)",
          [req.actorEmail],
        );
        const deletion = result.rows[0]!;
        if (deletion.owner_membership) {
          throw new HttpError(
            409,
            "Transfer ownership of or delete every organization you own before deleting your account.",
          );
        }
        if (!deletion.account_found) {
          throw new HttpError(404, "Active account not found.");
        }
        res.status(204).end();
      },
    )];

  return handlers;

}