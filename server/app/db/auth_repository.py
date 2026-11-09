from sqlalchemy import text
from sqlalchemy.orm import Session


def consume_auth_rate_limit(
    db: Session, scope: str, subject_hash: str, limit: int, window_seconds: int
) -> tuple[int, object]:
    """Atomically record an auth attempt in a database-shared time window."""
    result = db.execute(
        text("""
            INSERT INTO public.auth_rate_limit_buckets
                (scope, subject_hash, window_started_at, attempts)
            VALUES (:scope, :subject_hash, CURRENT_TIMESTAMP, 1)
            ON CONFLICT (scope, subject_hash) DO UPDATE
            SET attempts = CASE
                    WHEN auth_rate_limit_buckets.window_started_at
                         <= CURRENT_TIMESTAMP - (:window_seconds * interval '1 second')
                    THEN 1
                    ELSE LEAST(:limit + 1, auth_rate_limit_buckets.attempts + 1)
                END,
                window_started_at = CASE
                    WHEN auth_rate_limit_buckets.window_started_at
                         <= CURRENT_TIMESTAMP - (:window_seconds * interval '1 second')
                    THEN CURRENT_TIMESTAMP
                    ELSE auth_rate_limit_buckets.window_started_at
                END
            RETURNING attempts, window_started_at
        """),
        {
            "scope": scope,
            "subject_hash": subject_hash,
            "limit": limit,
            "window_seconds": window_seconds,
        },
    )
    row = result.mappings().one()
    db.execute(text("""
        WITH expired AS (
            SELECT ctid
            FROM public.auth_rate_limit_buckets
            WHERE window_started_at < CURRENT_TIMESTAMP - interval '7 days'
            LIMIT 100
        )
        DELETE FROM public.auth_rate_limit_buckets AS buckets
        USING expired
        WHERE buckets.ctid = expired.ctid
    """))
    return int(row["attempts"]), row["window_started_at"]


def get_user_by_email(db: Session, email: str) -> dict | None:
    result = db.execute(
        text("SELECT * FROM public.stockwise_auth_get_auth_user(:email)"),
        {"email": email.strip().lower()},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def create_owner(
    db: Session,
    name: str,
    email: str,
    password_hash: str,
) -> dict:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_auth_create_owner(
                :name, :email, :password_hash
            )
        """),
        {
            "name": name,
            "email": email.strip().lower(),
            "password_hash": password_hash,
        },
    )
    return dict(result.mappings().one())


def create_account(db: Session, name: str, email: str, password_hash: str) -> dict:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_auth_create_account(
                :name, :email, :password_hash
            )
        """),
        {
            "name": name.strip(),
            "email": email.strip().lower(),
            "password_hash": password_hash,
        },
    )
    return dict(result.mappings().one())


def save_registration_verification(
    db: Session,
    name: str,
    email: str,
    password_hash: str,
    code_hash: str,
) -> None:
    db.execute(text("""
        DELETE FROM public.auth_registration_verifications
        WHERE expires_at <= CURRENT_TIMESTAMP
    """))
    db.execute(
        text("""
            INSERT INTO public.auth_registration_verifications (
                email, full_name, password_hash, code_hash, expires_at,
                failed_attempts, created_at
            ) VALUES (
                :email, :name, :password_hash, :code_hash,
                CURRENT_TIMESTAMP + interval '10 minutes', 0, CURRENT_TIMESTAMP
            )
            ON CONFLICT (email) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                password_hash = EXCLUDED.password_hash,
                code_hash = EXCLUDED.code_hash,
                expires_at = EXCLUDED.expires_at,
                failed_attempts = 0,
                created_at = CURRENT_TIMESTAMP
        """),
        {
            "email": email.strip().lower(),
            "name": name.strip(),
            "password_hash": password_hash,
            "code_hash": code_hash,
        },
    )


def resend_registration_verification(
    db: Session, email: str, code_hash: str
) -> bool:
    result = db.execute(
        text("""
            UPDATE public.auth_registration_verifications
            SET code_hash = :code_hash,
                expires_at = CURRENT_TIMESTAMP + interval '10 minutes',
                failed_attempts = 0,
                created_at = CURRENT_TIMESTAMP
            WHERE email = :email
              AND created_at > CURRENT_TIMESTAMP - interval '24 hours'
            RETURNING email
        """),
        {"email": email.strip().lower(), "code_hash": code_hash},
    )
    return result.scalar_one_or_none() is not None


def consume_registration_verification(
    db: Session, email: str, code_hash: str
) -> dict:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_auth_registration_consume(
                :email, :code_hash
            )
        """),
        {"email": email.strip().lower(), "code_hash": code_hash},
    )
    return dict(result.mappings().one())


def owner_exists(db: Session) -> bool:
    return bool(
        db.execute(
            text("SELECT public.stockwise_auth_owner_exists()")
        ).scalar_one()
    )


def store_password_reset(
    db: Session, email: str, account_table: str, token_hash: str
) -> None:
    db.execute(
        text("""
            SELECT public.stockwise_auth_store_password_reset(
                :email, :account_table, :token_hash
            )
        """),
        {
            "email": email.strip().lower(),
            "account_table": account_table,
            "token_hash": token_hash,
        },
    )


def consume_password_reset(db: Session, token_hash: str, password_hash: str) -> bool:
    return bool(
        db.execute(
            text("""
                SELECT public.stockwise_auth_consume_password_reset(
                    :token_hash, :password_hash
                )
            """),
            {"token_hash": token_hash, "password_hash": password_hash},
        ).scalar_one()
    )


def get_authenticator(db: Session, email: str) -> dict | None:
    result = db.execute(
        text("SELECT * FROM public.stockwise_auth_mfa_get(:email)"),
        {"email": email.strip().lower()},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def save_pending_authenticator(db: Session, email: str, encrypted_secret: str) -> None:
    db.execute(
        text("SELECT public.stockwise_auth_mfa_begin(:email, :secret)"),
        {"email": email.strip().lower(), "secret": encrypted_secret},
    )


def enable_authenticator(
    db: Session, email: str, encrypted_secret: str, recovery_hashes: list[str],
    accepted_step: int,
) -> None:
    db.execute(
        text("SELECT public.stockwise_auth_mfa_enable(:email, :secret, :hashes, :step)"),
        {
            "email": email.strip().lower(),
            "secret": encrypted_secret,
            "hashes": recovery_hashes,
            "step": accepted_step,
        },
    )


def remove_authenticator(db: Session, email: str) -> None:
    db.execute(
        text("SELECT public.stockwise_auth_mfa_disable(:email)"),
        {"email": email.strip().lower()},
    )


def accept_totp_step(db: Session, email: str, step: int) -> bool:
    return bool(db.execute(
        text("SELECT public.stockwise_auth_mfa_accept_totp(:email, :step)"),
        {"email": email.strip().lower(), "step": step},
    ).scalar_one())


def mfa_disable_allowed(db: Session, email: str) -> bool:
    return bool(db.execute(
        text("SELECT public.stockwise_auth_mfa_disable_allowed(:email)"),
        {"email": email.strip().lower()},
    ).scalar_one())


def fail_mfa_disable(db: Session, email: str) -> bool:
    return bool(db.execute(
        text("SELECT public.stockwise_auth_mfa_disable_fail(:email)"),
        {"email": email.strip().lower()},
    ).scalar_one())


def create_mfa_challenge(db: Session, email: str, token_hash: str) -> None:
    db.execute(
        text("SELECT public.stockwise_auth_mfa_challenge_create(:email, :token_hash)"),
        {"email": email.strip().lower(), "token_hash": token_hash},
    )


def get_mfa_challenge(db: Session, token_hash: str) -> dict | None:
    result = db.execute(
        text("SELECT * FROM public.stockwise_auth_mfa_challenge_get(:token_hash)"),
        {"token_hash": token_hash},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def increment_mfa_challenge_attempt(db: Session, token_hash: str) -> None:
    db.execute(
        text("SELECT public.stockwise_auth_mfa_challenge_fail(:token_hash)"),
        {"token_hash": token_hash},
    )


def consume_mfa_challenge(db: Session, token_hash: str) -> None:
    db.execute(
        text("SELECT public.stockwise_auth_mfa_challenge_consume(:token_hash)"),
        {"token_hash": token_hash},
    )


def consume_recovery_code(db: Session, email: str, code_hash: str) -> bool:
    return bool(
        db.execute(
            text("SELECT public.stockwise_auth_mfa_recovery_consume(:email, :code_hash)"),
            {"email": email.strip().lower(), "code_hash": code_hash},
        ).scalar_one()
    )
