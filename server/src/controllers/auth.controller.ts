import {
  emailCheckSchema,
  forgotPasswordSchema,
  googleCredentialSchema,
  googleRegistrationSchema,
  loginSchema,
  registrationResendSchema,
  registrationSchema,
  registrationVerifySchema,
  resetPasswordSchema,
  twoFactorLoginSchema,
} from "../schemas/auth.schema.js";
import {
  createHash,
  createPublicKey,
  randomBytes,
  randomInt,
  verify as verifySignature,
} from "node:crypto";
import { type Request, type RequestHandler } from "express";
import type { Pool, PoolClient } from "pg";
import type { AppConfig } from "../config/app-config.js";
import {
  decryptTotpSecret,
  hashPassword,
  hashRecoveryCode,
  matchingTotpStep,
  registrationCodeHash,
  sha256Hex,
  verifyPassword,
} from "../services/auth-crypto.js";
import {
  registrationEmailConfigured,
  sendStockWiseEmail,
} from "../services/email.js";
import { HttpError } from "../middlewares/error-handler.js";
import type {
  AccountRow,
  GoogleClaims,
  GoogleJwk,
} from "../models/auth.js";

type Account = AccountRow;

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function publicUser(account: Account) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role === "admin" ? "manager" : account.role,
  };
}

function loginResult(user?: Account, challengeToken?: string) {
  if (challengeToken) {
    return {
      user: null,
      two_factor_required: true,
      challenge_token: challengeToken,
      registration_required: false,
    };
  }
  return {
    user: user ? publicUser(user) : null,
    two_factor_required: false,
    challenge_token: null,
    registration_required: false,
  };
}

function accountIsActive(account: Account): boolean {
  return account.is_deleted === false && account.is_active !== false;
}

async function authAccount(
  queryable: Pick<Pool, "query"> | PoolClient,
  email: string,
): Promise<Account | undefined> {
  const result = await queryable.query<Account>(
    "SELECT * FROM public.stockwise_auth_get_auth_user($1)",
    [normalizedEmail(email)],
  );
  return result.rows[0];
}

async function legacyAccount(
  queryable: Pick<Pool, "query"> | PoolClient,
  email: string,
): Promise<Account | undefined> {
  const result = await queryable.query<Account>(
    "SELECT * FROM public.stockwise_auth_get_legacy_user($1)",
    [normalizedEmail(email)],
  );
  return result.rows[0];
}

async function anyAccount(
  queryable: Pick<Pool, "query"> | PoolClient,
  email: string,
): Promise<Account | undefined> {
  return (
    (await authAccount(queryable, email)) ??
    (await legacyAccount(queryable, email))
  );
}

async function inTransaction<T>(
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
      // Preserve the original transaction error.
    }
    throw error;
  } finally {
    client.release();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function unavailable(message: string): HttpError {
  return new HttpError(503, message);
}

async function enforceRateLimit(
  pool: Pool,
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const clientIp = request.ip || request.socket.remoteAddress || "unknown";
  const subjectHash = createHash("sha256")
    .update(`${scope}\0${clientIp}`, "utf8")
    .digest("hex");
  let result;
  try {
    result = await pool.query<{
      attempts: number;
      window_started_at: Date | string;
    }>(
      "SELECT * FROM public.stockwise_auth_rate_limit_record($1, $2, $3, $4)",
      [scope, subjectHash, limit, windowSeconds],
    );
    await pool.query("CALL public.stockwise_auth_rate_limit_cleanup()");
  } catch {
    throw unavailable("Authentication is temporarily unavailable.");
  }
  const row = result.rows[0];
  if (!row) throw unavailable("Authentication is temporarily unavailable.");
  if (Number(row.attempts) > limit) {
    const started =
      row.window_started_at instanceof Date
        ? row.window_started_at.getTime()
        : new Date(row.window_started_at).getTime();
    const retryAfter = Math.max(
      1,
      Math.floor(started / 1000 + windowSeconds - Date.now() / 1000),
    );
    throw new HttpError(429, "Too many requests. Try again later.", {
      "Retry-After": String(retryAfter),
    });
  }
}

async function mfaEnabled(pool: Pool, email: string): Promise<boolean> {
  const result = await pool.query<{ enabled: boolean }>(
    "SELECT * FROM public.stockwise_auth_mfa_get($1)",
    [normalizedEmail(email)],
  );
  return Boolean(result.rows[0]?.enabled);
}

async function createMfaChallenge(pool: Pool, email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    "SELECT public.stockwise_auth_mfa_challenge_create($1, $2)",
    [normalizedEmail(email), sha256Hex(token)],
  );
  return token;
}

async function loginResponse(pool: Pool, account: Account) {
  if (await mfaEnabled(pool, account.email)) {
    const challengeToken = await createMfaChallenge(pool, account.email);
    return loginResult(undefined, challengeToken);
  }
  return loginResult(account);
}

async function queueLoginAlert(
  pool: Pool,
  email: string,
  deviceId: string | null | undefined,
): Promise<void> {
  if (!deviceId) return;
  try {
    const normalized = normalizedEmail(email);
    const enabled = await pool.query<{ login_alert_emails: boolean }>(
      "SELECT * FROM public.stockwise_auth_login_alerts_enabled($1)",
      [normalized],
    );
    if (!enabled.rows[0]?.login_alert_emails) return;
    const deviceHash = sha256Hex(deviceId);
    const isNew = await inTransaction(pool, async (client) => {
      const recorded = await client.query<{
        stockwise_auth_login_device_record: boolean;
      }>(
        "SELECT public.stockwise_auth_login_device_record($1, $2)",
        [normalized, deviceHash],
      );
      return Boolean(recorded.rows[0]?.stockwise_auth_login_device_record);
    });
    if (isNew) {
      void sendStockWiseEmail({
        to: normalized,
        subject: "New device signed in to StockWise",
        text:
          "Your StockWise account was accessed from a device or browser that has not signed in before.\n\n" +
          `Time: ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC\n\n` +
          "If this was not you, change your password and review your account security settings.",
      }).catch(() => undefined);
    }
  } catch {
    // Login alerts are best-effort and must not block authentication.
  }
}

let googleJwksCache:
  | { keys: GoogleJwk[]; expiresAt: number }
  | undefined;

async function googleJwks(): Promise<GoogleJwk[]> {
  if (googleJwksCache && googleJwksCache.expiresAt > Date.now()) {
    return googleJwksCache.keys;
  }
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Unable to load Google signing keys.");
  const document = (await response.json()) as {
    keys?: GoogleJwk[];
  };
  if (!Array.isArray(document.keys)) {
    throw new Error("Google signing keys are invalid.");
  }
  const maxAge = /max-age=(\d+)/i.exec(
    response.headers.get("cache-control") ?? "",
  );
  const cacheSeconds = Math.min(
    86_400,
    Math.max(60, Number(maxAge?.[1] ?? 300)),
  );
  googleJwksCache = {
    keys: document.keys,
    expiresAt: Date.now() + cacheSeconds * 1000,
  };
  return document.keys;
}

async function verifiedGoogleClaims(
  credential: string,
  nonce: string,
): Promise<GoogleClaims> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw unavailable("Google sign-in is not configured.");

  try {
    const pieces = credential.split(".");
    if (pieces.length !== 3) throw new Error("Malformed JWT.");
    const header = JSON.parse(
      Buffer.from(pieces[0]!, "base64url").toString("utf8"),
    ) as { alg?: unknown; kid?: unknown };
    const claims = JSON.parse(
      Buffer.from(pieces[1]!, "base64url").toString("utf8"),
    ) as GoogleClaims;
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
      throw new Error("Unsupported Google token signing algorithm.");
    }
    const key = (await googleJwks()).find(
      (candidate) =>
        candidate.kid === header.kid &&
        candidate.kty === "RSA" &&
        (candidate.use === undefined || candidate.use === "sig") &&
        (candidate.alg === undefined || candidate.alg === "RS256"),
    );
    if (!key) throw new Error("Google token signing key was not found.");
    const publicKey = createPublicKey({
      key: key as import("node:crypto").JsonWebKey,
      format: "jwk",
    });
    const signature = Buffer.from(pieces[2]!, "base64url");
    if (
      !verifySignature(
        "RSA-SHA256",
        Buffer.from(`${pieces[0]}.${pieces[1]}`),
        publicKey,
        signature,
      )
    ) {
      throw new Error("Google token signature is invalid.");
    }

    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      (claims.iss !== "accounts.google.com" &&
        claims.iss !== "https://accounts.google.com") ||
      !audiences.includes(clientId) ||
      (audiences.length > 1 && claims.azp !== clientId) ||
      typeof claims.exp !== "number" ||
      claims.exp <= now ||
      typeof claims.iat !== "number" ||
      claims.iat > now + 60 ||
      claims.nonce !== nonce ||
      claims.email_verified !== true ||
      typeof claims.email !== "string" ||
      !claims.email.trim()
    ) {
      throw new Error("Google token claims are invalid.");
    }
    return claims;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Google sign-in could not be verified.");
  }
}

async function findGoogleAccount(
  pool: Pool,
  credential: string,
  nonce: string,
): Promise<Account | undefined> {
  const claims = await verifiedGoogleClaims(credential, nonce);
  try {
    const account = await anyAccount(pool, claims.email as string);
    if (account && !accountIsActive(account)) {
      throw new HttpError(401, "Google sign-in could not be verified.");
    }
    return account;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unavailable("Unable to sign in with Google right now.");
  }
}

async function registerGoogleAccount(
  pool: Pool,
  credential: string,
  nonce: string,
  password: string,
): Promise<Account> {
  const claims = await verifiedGoogleClaims(credential, nonce);
  const email = normalizedEmail(claims.email as string);
  const givenName =
    typeof claims.given_name === "string" ? claims.given_name.trim() : "";
  const familyName =
    typeof claims.family_name === "string" ? claims.family_name.trim() : "";
  const claimName = [givenName, familyName].filter(Boolean).join(" ");
  const name = (
    claimName || (typeof claims.name === "string" ? claims.name : email)
  ).slice(0, 160);
  const passwordHash = await hashPassword(password);

  try {
    return await inTransaction(pool, async (client) => {
      const account = await authAccount(client, email);
      if (account) {
        if (!accountIsActive(account)) {
          throw new HttpError(
            401,
            "Google sign-in expired. Start again to create your account.",
          );
        }
        await client.query(
          "SELECT public.stockwise_settings_update_password($1, $2, $3)",
          [email, "auth_users", passwordHash],
        );
        return (await authAccount(client, email))!;
      }

      const legacy = await legacyAccount(client, email);
      if (legacy) {
        if (legacy.is_deleted) {
          throw new HttpError(
            401,
            "Google sign-in expired. Start again to create your account.",
          );
        }
        const updated = await client.query<{
          stockwise_settings_update_password: boolean;
        }>("SELECT public.stockwise_settings_update_password($1, $2, $3)", [
          email,
          "users",
          passwordHash,
        ]);
        if (!updated.rows[0]?.stockwise_settings_update_password) {
          throw unavailable("Unable to save your StockWise password.");
        }
        return (await legacyAccount(client, email))!;
      }

      const created = await client.query<Account>(
        "SELECT * FROM public.stockwise_auth_create_account($1, $2, $3)",
        [name, email, passwordHash],
      );
      return created.rows[0]!;
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if ((error as { code?: string }).code === "23505") {
      try {
        const account = await authAccount(pool, email);
        if (account && accountIsActive(account)) {
          await pool.query(
            "SELECT public.stockwise_settings_update_password($1, $2, $3)",
            [email, "auth_users", passwordHash],
          );
          return (await authAccount(pool, email))!;
        }
        throw new HttpError(
          409,
          "An account with this email already exists. Sign in instead.",
        );
      } catch (conflictError) {
        if (conflictError instanceof HttpError) throw conflictError;
        throw unavailable("Unable to complete Google registration right now.");
      }
    }
    throw unavailable("Unable to complete Google registration right now.");
  }
}

async function markGoogleConnected(pool: Pool, email: string): Promise<void> {
  const normalized = normalizedEmail(email);
  await pool.query("SELECT public.stockwise_settings_ensure($1)", [normalized]);
  await pool.query("CALL public.stockwise_auth_mark_google_connected($1)", [
    normalized,
  ]);
}

async function verifyTwoFactorChallenge(
  pool: Pool,
  config: AppConfig,
  token: string,
  code: string,
): Promise<Account | undefined> {
  const tokenHash = sha256Hex(token);
  return inTransaction(pool, async (client) => {
    const challengeResult = await client.query<{
      email: string;
      failed_attempts: number;
    }>("SELECT * FROM public.stockwise_auth_mfa_challenge_get($1)", [
      tokenHash,
    ]);
    const challenge = challengeResult.rows[0];
    if (!challenge) return undefined;

    const mfaResult = await client.query<{
      secret_ciphertext: string | null;
      enabled: boolean;
    }>("SELECT * FROM public.stockwise_auth_mfa_get($1)", [
      normalizedEmail(challenge.email),
    ]);
    const authenticator = mfaResult.rows[0];
    if (!authenticator?.enabled) {
      await client.query(
        "SELECT public.stockwise_auth_mfa_challenge_consume($1)",
        [tokenHash],
      );
      return undefined;
    }

    let valid = false;
    let secret: string;
    try {
      secret = decryptTotpSecret(
        authenticator.secret_ciphertext,
        config.internalApiKey,
      );
    } catch (error) {
      throw new HttpError(503, errorMessage(error));
    }
    const acceptedStep = matchingTotpStep(secret, code);
    if (acceptedStep !== null) {
      const accepted = await client.query<{
        stockwise_auth_mfa_accept_totp: boolean;
      }>("SELECT public.stockwise_auth_mfa_accept_totp($1, $2)", [
        normalizedEmail(challenge.email),
        acceptedStep,
      ]);
      valid = Boolean(accepted.rows[0]?.stockwise_auth_mfa_accept_totp);
    }
    if (!valid) {
      try {
        const consumed = await client.query<{
          stockwise_auth_mfa_recovery_consume: boolean;
        }>("SELECT public.stockwise_auth_mfa_recovery_consume($1, $2)", [
          normalizedEmail(challenge.email),
          hashRecoveryCode(code),
        ]);
        valid = Boolean(consumed.rows[0]?.stockwise_auth_mfa_recovery_consume);
      } catch {
        valid = false;
      }
    }
    if (!valid) {
      await client.query(
        "SELECT public.stockwise_auth_mfa_challenge_fail($1)",
        [tokenHash],
      );
      return undefined;
    }

    await client.query(
      "SELECT public.stockwise_auth_mfa_challenge_consume($1)",
      [tokenHash],
    );
    let account = await authAccount(client, challenge.email);
    if (account) {
      if (!accountIsActive(account)) return undefined;
    } else {
      account = await legacyAccount(client, challenge.email);
      if (!account || account.is_deleted) return undefined;
    }
    return account;
  });
}

function passwordResetEmail(config: AppConfig, email: string, token: string) {
  const url = `${config.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendStockWiseEmail({
    to: email,
    subject: "Reset your StockWise password",
    text:
      "We received a request to reset your StockWise password.\n\n" +
      `Use this link within 30 minutes: ${url}\n\n` +
      "If you did not request this, you can ignore this email.",
  });
}

export function createAuthController(pool: Pool, config: AppConfig): Record<string, RequestHandler[]> {
  const handlers: Record<string, RequestHandler[]> = {};

  handlers["POST /register"] = [async (req, res) => {
    const request = registrationSchema.parse(req.body);
    await enforceRateLimit(pool, req, "register", 5, 60 * 60);
    if (!registrationEmailConfigured()) {
      throw unavailable(
        "Email verification is not configured. Contact the StockWise administrator.",
      );
    }
    const email = normalizedEmail(request.email);
    const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
    let passwordHash: string;
    try {
      passwordHash = await hashPassword(request.password);
      await inTransaction(pool, async (client) => {
        if (await anyAccount(client, email)) {
          throw new HttpError(
            409,
            "An account with this email already exists. Sign in instead.",
          );
        }
        await client.query(
          "CALL public.stockwise_auth_registration_verification_store($1, $2, $3, $4)",
          [
            email,
            request.name.trim(),
            passwordHash,
            registrationCodeHash(config.internalApiKey, email, code),
          ],
        );
        let sent: boolean;
        try {
          sent = await sendStockWiseEmail({
            to: email,
            subject: "Verify your StockWise email",
            text:
              "Use this 8-digit code to verify your email and create your StockWise account:\n\n" +
              `${code}\n\n` +
              "This code expires in 10 minutes. Your StockWise password is separate from your Gmail password.",
          });
        } catch {
          throw unavailable(
            "Unable to send a StockWise registration verification email.",
          );
        }
        if (!sent) {
          throw unavailable(
            "Email verification is not configured. Contact the StockWise administrator.",
          );
        }
      });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (
        error instanceof Error &&
        error.message.includes("Email verification")
      ) {
        throw unavailable(error.message);
      }
      throw unavailable(
        "Unable to start registration right now. Please try again.",
      );
    }
    res.status(202).json({
      message: "Check your Gmail inbox for an 8-digit verification code.",
    });
  }];

  handlers["POST /register/check"] = [async (req, res) => {
    const request = emailCheckSchema.parse(req.body);
    await enforceRateLimit(pool, req, "register-check", 10, 15 * 60);
    try {
      res.json({ exists: Boolean(await anyAccount(pool, request.email)) });
    } catch {
      throw unavailable(
        "Unable to check this Gmail address right now. Please try again.",
      );
    }
  }];

  handlers["POST /register/resend"] = [async (req, res) => {
    const request = registrationResendSchema.parse(req.body);
    await enforceRateLimit(pool, req, "register-resend", 3, 15 * 60);
    if (!registrationEmailConfigured()) {
      throw unavailable(
        "Email verification is not configured. Contact the StockWise administrator.",
      );
    }
    const email = normalizedEmail(request.email);
    const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
    try {
      await inTransaction(pool, async (client) => {
        const updated = await client.query<{
          stockwise_auth_registration_verification_resend: boolean;
        }>(
          "SELECT public.stockwise_auth_registration_verification_resend($1, $2)",
          [email, registrationCodeHash(config.internalApiKey, email, code)],
        );
        if (
          updated.rows[0]?.stockwise_auth_registration_verification_resend
        ) {
          let sent: boolean;
          try {
            sent = await sendStockWiseEmail({
              to: email,
              subject: "Verify your StockWise email",
              text:
                "Use this 8-digit code to verify your email and create your StockWise account:\n\n" +
                `${code}\n\n` +
                "This code expires in 10 minutes. Your StockWise password is separate from your Gmail password.",
            });
          } catch {
            throw unavailable(
              "Unable to send a StockWise registration verification email.",
            );
          }
          if (!sent) {
            throw unavailable(
              "Email verification is not configured. Contact the StockWise administrator.",
            );
          }
        }
      });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable("Unable to resend the verification code right now.");
    }
    res.json({
      message: "If registration is pending, a new code has been sent.",
    });
  }];

  handlers["POST /register/verify"] = [async (req, res) => {
    const request = registrationVerifySchema.parse(req.body);
    await enforceRateLimit(pool, req, "register-verify", 20, 15 * 60);
    const email = normalizedEmail(request.email);
    const codeHash = registrationCodeHash(
      config.internalApiKey,
      email,
      request.code,
    );
    try {
      const outcome = await inTransaction(pool, async (client) => {
        const result = await client.query<{
          result: string;
          full_name: string | null;
          password_hash: string | null;
        }>("SELECT * FROM public.stockwise_auth_registration_consume($1, $2)", [
          email,
          codeHash,
        ]);
        const pending = result.rows[0];
        if (!pending || pending.result !== "verified")
          return { invalid: true as const };
        if (await anyAccount(client, email)) return { exists: true as const };
        const created = await client.query<Account>(
          "SELECT * FROM public.stockwise_auth_create_account($1, $2, $3)",
          [pending.full_name, email, pending.password_hash],
        );
        return { account: created.rows[0]! };
      });
      if ("invalid" in outcome) {
        throw new HttpError(
          400,
          "That code is invalid or expired. Request a new code and try again.",
        );
      }
      if ("exists" in outcome) {
        throw new HttpError(
          409,
          "An account with this email already exists. Sign in instead.",
        );
      }
      res.json(await loginResponse(pool, outcome.account));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if ((error as { code?: string }).code === "23505") {
        throw new HttpError(
          409,
          "An account with this email already exists. Sign in instead.",
        );
      }
      throw unavailable(
        "Unable to verify your email right now. Please try again.",
      );
    }
  }];

  handlers["POST /login"] = [async (req, res) => {
    const request = loginSchema.parse(req.body);
    await enforceRateLimit(pool, req, "login", 20, 15 * 60);
    const email = normalizedEmail(request.email);
    try {
      const authUser = await authAccount(pool, email);
      if (authUser) {
        if (
          !accountIsActive(authUser) ||
          !(await verifyPassword(request.password, authUser.password_hash))
        ) {
          throw new HttpError(401, "Invalid email or password.");
        }
        const response = await loginResponse(pool, authUser);
        if (response.user) {
          await queueLoginAlert(pool, authUser.email, request.device_id);
        }
        res.json(response);
        return;
      }
      const user = await legacyAccount(pool, email);
      const passwordValid = await verifyPassword(
        request.password,
        user?.password_hash ??
          `pbkdf2_sha256$600000$${"00".repeat(16)}$${"00".repeat(32)}`,
      );
      if (!user || user.is_deleted || !passwordValid) {
        throw new HttpError(401, "Invalid email or password.");
      }
      const response = await loginResponse(pool, user);
      if (response.user) {
        await queueLoginAlert(pool, user.email, request.device_id);
      }
      res.json(response);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable("Unable to authenticate right now. Please try again.");
    }
  }];

  handlers["POST /verify-2fa"] = [async (req, res) => {
    const request = twoFactorLoginSchema.parse(req.body);
    let account: Account | undefined;
    try {
      account = await verifyTwoFactorChallenge(
        pool,
        config,
        request.challenge_token,
        request.code,
      );
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable("Unable to verify the code right now.");
    }
    if (!account) {
      throw new HttpError(
        401,
        "The code is invalid or the verification attempt expired.",
      );
    }
    await queueLoginAlert(pool, account.email, request.device_id);
    res.json(loginResult(account));
  }];

  handlers["POST /google"] = [async (req, res) => {
    const request = googleCredentialSchema.parse(req.body);
    await enforceRateLimit(pool, req, "google-login", 20, 15 * 60);
    let account: Account | undefined;
    try {
      account = await findGoogleAccount(
        pool,
        request.credential,
        request.nonce,
      );
      if (!account || request.mode === "register") {
        res.json({
          user: null,
          two_factor_required: false,
          challenge_token: null,
          registration_required: true,
        });
        return;
      }
      await markGoogleConnected(pool, account.email);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable("Unable to sign in with Google right now.");
    }
    const response = await loginResponse(pool, account);
    if (response.user) {
      await queueLoginAlert(pool, account.email, request.device_id);
    }
    res.json(response);
  }];

  handlers["POST /google/register"] = [async (req, res) => {
    const request = googleRegistrationSchema.parse(req.body);
    await enforceRateLimit(pool, req, "google-register", 10, 60 * 60);
    let account: Account;
    try {
      account = await registerGoogleAccount(
        pool,
        request.credential,
        request.nonce,
        request.password,
      );
      await markGoogleConnected(pool, account.email);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable("Unable to complete Google registration right now.");
    }
    const response = await loginResponse(pool, account);
    if (response.user) {
      await queueLoginAlert(pool, account.email, request.device_id);
    }
    res.json(response);
  }];

  handlers["POST /forgot-password"] = [async (req, res) => {
    const request = forgotPasswordSchema.parse(req.body);
    await enforceRateLimit(pool, req, "forgot-password", 5, 15 * 60);
    if (!registrationEmailConfigured()) {
      throw unavailable("Password reset email is not configured.");
    }
    const email = normalizedEmail(request.email);
    let resetToken: string | undefined;
    try {
      resetToken = await inTransaction(pool, async (client) => {
        let account = await authAccount(client, email);
        let table = "auth_users";
        if (account && !accountIsActive(account)) return undefined;
        if (!account) {
          account = await legacyAccount(client, email);
          table = "users";
          if (!account || account.is_deleted) return undefined;
        }
        const token = randomBytes(32).toString("base64url");
        await client.query(
          "SELECT public.stockwise_auth_store_password_reset($1, $2, $3)",
          [email, table, sha256Hex(token)],
        );
        return token;
      });
    } catch {
      throw unavailable(
        "Unable to process the password reset request right now.",
      );
    }
    if (resetToken) {
      void passwordResetEmail(config, email, resetToken).catch(() => undefined);
    }
    res.status(202).json({
      message: "If the account exists, a reset link will be emailed.",
    });
  }];

  handlers["POST /reset-password"] = [async (req, res) => {
    const request = resetPasswordSchema.parse(req.body);
    await enforceRateLimit(pool, req, "reset-password", 10, 15 * 60);
    try {
      const updated = await inTransaction(pool, async (client) => {
        const result = await client.query<{
          stockwise_auth_consume_password_reset: boolean;
        }>("SELECT public.stockwise_auth_consume_password_reset($1, $2)", [
          sha256Hex(request.token),
          await hashPassword(request.new_password),
        ]);
        return Boolean(result.rows[0]?.stockwise_auth_consume_password_reset);
      });
      if (!updated) {
        throw new HttpError(
          400,
          "This reset link is invalid or expired. Request a new one.",
        );
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable("Unable to reset your password right now.");
    }
    res.status(204).end();
  }];

  return handlers;

}