import type { Pool, PoolClient, QueryResultRow } from "pg";

type QueryExecutor = Pick<Pool, "query"> | PoolClient;

export function runSettingsGetSecurityPrivacyPreferencesQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_get_security_privacy_preferences($1)",
    values,
  );
}

export function runSettingsUpdateSecurityPrivacyPreferencesQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_update_security_privacy_preferences($1, $2, $3)",
    values,
  );
}

export function runSettingsClearLoginDevicesQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "CALL public.stockwise_settings_clear_login_devices($1)",
    values,
  );
}

export function runSettingsGetInventoryDefaultsQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_get_inventory_defaults($1)",
    values,
  );
}

export function runSettingsUpdateInventoryDefaultsQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_update_inventory_defaults($1, $2)",
    values,
  );
}

export function runSettingsGetSecurityStatusQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_get_security_status($1)",
    values,
  );
}

export function runSettingsGetUsageAnalyticsConsentQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_get_usage_analytics_consent($1)",
    values,
  );
}

export function runSettingsUpdateUsageAnalyticsConsentQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_update_usage_analytics_consent($1, $2)",
    values,
  );
}

export function runAuthMfaGetQuery<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "SELECT enabled FROM public.stockwise_auth_mfa_get($1)",
    values,
  );
}

export function runAuthMfaGetQuery2<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "SELECT enabled FROM public.stockwise_auth_mfa_get($1)",
    values,
  );
}

export function runAuthMfaBeginQuery<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_begin($1, $2)",
    values,
  );
}

export function runAuthMfaGetQuery3<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "SELECT pending_secret_ciphertext FROM public.stockwise_auth_mfa_get($1)",
    values,
  );
}

export function runAuthMfaEnableQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_enable($1, $2, $3::text[], $4)",
    values,
  );
}

export function runAuthMfaGetQuery4<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "SELECT secret_ciphertext, enabled FROM public.stockwise_auth_mfa_get($1)",
    values,
  );
}

export function runAuthMfaDisableAllowedQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_disable_allowed($1) AS allowed",
    values,
  );
}

export function runAuthMfaAcceptTotpQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_accept_totp($1, $2) AS accepted",
    values,
  );
}

export function runAuthMfaRecoveryConsumeQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_recovery_consume($1, $2) AS consumed",
    values,
  );
}

export function runAuthMfaDisableFailQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_disable_fail($1)",
    values,
  );
}

export function runAuthMfaDisableQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_disable($1)",
    values,
  );
}

export function runSettingsGetAccountQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_get_account($1)",
    values,
  );
}

export function runSettingsUpdateProfileQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT * FROM public.stockwise_settings_update_profile($1, $2, $3)`,
    values,
  );
}

export function runSettingsUpdateAvatarQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_update_avatar($1, $2)",
    values,
  );
}

export function runSettingsUpdatePreferencesQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT * FROM public.stockwise_settings_update_preferences(
          $1, $2, $3, $4, $5, $6, $7, $8
        )`,
    values,
  );
}

export function runSettingsGetPasswordAccountQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_get_password_account($1)",
    values,
  );
}

export function runSettingsUpdatePasswordQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_settings_update_password($1, $2, $3) AS updated",
    values,
  );
}

export function runSettingsDeleteAccountQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_settings_delete_account($1)",
    values,
  );
}
