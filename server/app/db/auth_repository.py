from sqlalchemy import text
from sqlalchemy.orm import Session


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
