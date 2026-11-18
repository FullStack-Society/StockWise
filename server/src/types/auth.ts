import type { QueryResultRow } from "pg";

export interface AccountRow extends QueryResultRow {
  id: number;
  name: string;
  email: string;
  role: string;
  password_hash?: string;
  is_active?: boolean;
  is_deleted: boolean;
}

export type GoogleClaims = {
  email?: unknown;
  email_verified?: unknown;
  nonce?: unknown;
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
  iat?: unknown;
  azp?: unknown;
  [key: string]: unknown;
};

export type GoogleJwk = {
  kid?: unknown;
  kty?: unknown;
  use?: unknown;
  alg?: unknown;
  [key: string]: unknown;
};

export interface AuthRateLimitRow extends QueryResultRow {
  attempts: number;
  window_started_at: Date | string;
}

export interface MfaChallengeRow extends QueryResultRow {
  email: string;
  attempts: number;
  expires_at: Date | string;
}

export interface MfaSecretRow extends QueryResultRow {
  secret_ciphertext: string | null;
  recovery_code_hashes: string[] | null;
  last_totp_step: string | number | null;
}
