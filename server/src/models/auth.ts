import type { Pool, PoolClient, QueryResultRow } from "pg";

type QueryExecutor = Pick<Pool, "query"> | PoolClient;

export function runAuthGetUserQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_get_user($1)",
    values,
  );
}

export function runAuthRateLimitRecordQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_rate_limit_record($1, $2, $3, $4)",
    values,
  );
}

export function runAuthRateLimitCleanupQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "CALL public.stockwise_auth_rate_limit_cleanup()",
    values,
  );
}

export function runAuthMfaGetQuery<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_mfa_get($1)",
    values,
  );
}

export function runAuthMfaChallengeCreateQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_challenge_create($1, $2)",
    values,
  );
}

export function runAuthLoginAlertsEnabledQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_login_alerts_enabled($1)",
    values,
  );
}

export function runAuthLoginDeviceRecordQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_login_device_record($1, $2)",
    values,
  );
}

export function runSettingsUpdatePasswordQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_settings_update_password($1, $2, $3)",
    values,
  );
}

export function runSettingsUpdatePasswordQuery2<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_settings_update_password($1, $2, $3)",
    values,
  );
}

export function runAuthCreateAccountQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_create_account($1, $2, $3)",
    values,
  );
}

export function runSettingsUpdatePasswordQuery3<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_settings_update_password($1, $2, $3)",
    values,
  );
}

export function runSettingsEnsureQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_settings_ensure($1)",
    values,
  );
}

export function runAuthMarkGoogleConnectedQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "CALL public.stockwise_auth_mark_google_connected($1)",
    values,
  );
}

export function runAuthMfaChallengeGetQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_mfa_challenge_get($1)",
    values,
  );
}

export function runAuthMfaGetQuery2<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_mfa_get($1)",
    values,
  );
}

export function runAuthMfaChallengeConsumeQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_challenge_consume($1)",
    values,
  );
}

export function runAuthMfaAcceptTotpQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_accept_totp($1, $2)",
    values,
  );
}

export function runAuthMfaRecoveryConsumeQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_recovery_consume($1, $2)",
    values,
  );
}

export function runAuthMfaChallengeFailQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_challenge_fail($1)",
    values,
  );
}

export function runAuthMfaChallengeConsumeQuery2<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_mfa_challenge_consume($1)",
    values,
  );
}

export function runAuthRegistrationVerificationStoreQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "CALL public.stockwise_auth_registration_verification_store($1, $2, $3, $4)",
    values,
  );
}

export function runAuthRegistrationVerificationResendQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_registration_verification_resend($1, $2)",
    values,
  );
}

export function runAuthRegistrationConsumeQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_registration_consume($1, $2)",
    values,
  );
}

export function runAuthCreateAccountQuery2<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_auth_create_account($1, $2, $3)",
    values,
  );
}

export function runAuthStorePasswordResetQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_store_password_reset($1, $2, $3)",
    values,
  );
}

export function runAuthConsumePasswordResetQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_auth_consume_password_reset($1, $2)",
    values,
  );
}
