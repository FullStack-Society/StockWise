import type { QueryResultRow } from "pg";

export interface UserSettingsRow extends QueryResultRow {
  email: string;
  timezone: string;
}

export interface MfaSettingsRow extends QueryResultRow {
  enabled: boolean;
  secret_ciphertext: string | null;
  recovery_code_hashes: string[] | null;
  last_totp_step: string | number | null;
}

export type SettingsRecord = Record<string, unknown>;
