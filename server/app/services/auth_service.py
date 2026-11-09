import hashlib
import hmac
import logging
import os
import secrets
import smtplib
import ssl
from datetime import datetime, timezone
from email.message import EmailMessage
from urllib.parse import quote

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.db import auth_repository as repository
from app.db import user_repository
from app.core.config import settings

logger = logging.getLogger(__name__)
HASH_NAME = "pbkdf2_sha256"
HASH_ITERATIONS = 600_000
SALT_BYTES = 16
MIN_PASSWORD_LENGTH = 12
_DUMMY_HASH = f"{HASH_NAME}${HASH_ITERATIONS}$" + "00" * SALT_BYTES + "$" + (
    hashlib.pbkdf2_hmac(
        "sha256",
        b"invalid-login-password",
        bytes(SALT_BYTES),
        HASH_ITERATIONS,
    ).hex()
)


class InvalidCredentialsError(Exception):
    pass


class AccountAlreadyExistsError(Exception):
    pass


class InvalidRegistrationCodeError(Exception):
    pass


class AuthenticationSetupError(Exception):
    pass


class InvalidGoogleCredentialError(Exception):
    pass


def hash_password(password: str) -> str:
    salt = os.urandom(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        HASH_ITERATIONS,
    )
    return f"{HASH_NAME}${HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_raw, salt_raw, digest_raw = encoded.split("$")
        if algorithm != HASH_NAME:
            return False
        iterations = int(iterations_raw)
        salt = bytes.fromhex(salt_raw)
        expected = bytes.fromhex(digest_raw)
        if (
            iterations != HASH_ITERATIONS
            or len(salt) != SALT_BYTES
            or len(expected) != hashlib.sha256().digest_size
        ):
            return False
    except (ValueError, TypeError):
        return False

    actual = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual, expected)


def seed_owner(
    db: Session,
    name: str | None,
    email: str | None,
    password: str | None,
) -> None:
    if repository.owner_exists(db):
        return
    if not email or not password:
        raise AuthenticationSetupError(
            "Set both OWNER_EMAIL and OWNER_PASSWORD to create the initial owner."
        )
    if len(password) < MIN_PASSWORD_LENGTH:
        raise AuthenticationSetupError(
            f"OWNER_PASSWORD must be at least {MIN_PASSWORD_LENGTH} characters."
        )

    normalized_email = email.strip().lower()
    existing = repository.get_user_by_email(db, normalized_email)
    if existing:
        raise AuthenticationSetupError(
            "OWNER_EMAIL is already assigned to a non-owner account."
        )

    try:
        repository.create_owner(
            db,
            name=(name or "StockWise Owner").strip() or "StockWise Owner",
            email=normalized_email,
            password_hash=hash_password(password),
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AuthenticationSetupError(
            "Unable to create the initial owner because the email already exists."
        ) from exc


def register_account(
    db: Session,
    name: str,
    email: str,
    password: str,
) -> dict:
    normalized_email = email.strip().lower()
    try:
        if (
            repository.get_user_by_email(db, normalized_email)
            or user_repository.get_user_by_email(db, normalized_email)
        ):
            raise AccountAlreadyExistsError

        account = repository.create_account(
            db,
            name=name.strip(),
            email=normalized_email,
            password_hash=hash_password(password),
        )
        db.commit()
        return account
    except AccountAlreadyExistsError:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        original_error = exc.orig
        sqlstate = getattr(original_error, "sqlstate", None) or getattr(
            original_error, "pgcode", None
        )
        diagnostics = getattr(original_error, "diag", None)
        constraint_name = getattr(diagnostics, "constraint_name", None)
        logger.error(
            "Integrity error during account registration "
            "(SQLSTATE %s, constraint %s)",
            sqlstate,
            constraint_name,
        )
        if sqlstate == "23505" and constraint_name in {
            "auth_users_email_key",
            "ix_auth_users_email",
        }:
            raise AccountAlreadyExistsError from exc
        raise AuthenticationSetupError(
            "Unable to create the account right now. Please try again."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        original_error = getattr(exc, "orig", None)
        sqlstate = getattr(original_error, "sqlstate", None) or getattr(
            original_error, "pgcode", None
        )
        logger.error(
            "Database error during account registration "
            "(SQLSTATE %s, error type %s)",
            sqlstate,
            type(exc).__name__,
        )
        raise AuthenticationSetupError(
            "Unable to create the account right now. Please try again."
        ) from exc


def _registration_code_hash(email: str, code: str) -> str:
    key = settings.internal_api_key
    if not key or len(key) < 32:
        raise AuthenticationSetupError(
            "Email verification requires a configured internal API key."
        )
    message = f"stockwise-registration:{email.strip().lower()}:{code}".encode("utf-8")
    return hmac.new(key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _require_registration_email() -> None:
    if not settings.smtp_username or not settings.smtp_app_password:
        raise AuthenticationSetupError(
            "Email verification is not configured. Contact the StockWise administrator."
        )


def request_registration_verification(
    db: Session, name: str, email: str, password: str
) -> None:
    normalized_email = email.strip().lower()
    _require_registration_email()
    try:
        if (
            repository.get_user_by_email(db, normalized_email)
            or user_repository.get_user_by_email(db, normalized_email)
        ):
            raise AccountAlreadyExistsError

        code = f"{secrets.randbelow(100_000_000):08d}"
        repository.save_registration_verification(
            db,
            name.strip(),
            normalized_email,
            hash_password(password),
            _registration_code_hash(normalized_email, code),
        )
        send_registration_verification_email(normalized_email, code)
        db.commit()
    except (AccountAlreadyExistsError, AuthenticationSetupError):
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while beginning email-verified registration")
        raise AuthenticationSetupError(
            "Unable to start registration right now. Please try again."
        ) from exc


def resend_registration_verification(db: Session, email: str) -> None:
    normalized_email = email.strip().lower()
    _require_registration_email()
    code = f"{secrets.randbelow(100_000_000):08d}"
    try:
        pending = repository.resend_registration_verification(
            db, normalized_email, _registration_code_hash(normalized_email, code)
        )
        if pending:
            send_registration_verification_email(normalized_email, code)
        db.commit()
    except AuthenticationSetupError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while resending registration verification")
        raise AuthenticationSetupError(
            "Unable to resend the verification code right now."
        ) from exc


def verify_registration(db: Session, email: str, code: str) -> dict:
    normalized_email = email.strip().lower()
    try:
        pending = repository.consume_registration_verification(
            db, normalized_email, _registration_code_hash(normalized_email, code)
        )
        if pending["result"] != "verified":
            db.commit()  # Persist the failed-attempt counter.
            raise InvalidRegistrationCodeError

        if (
            repository.get_user_by_email(db, normalized_email)
            or user_repository.get_user_by_email(db, normalized_email)
        ):
            db.commit()
            raise AccountAlreadyExistsError

        account = repository.create_account(
            db,
            pending["full_name"],
            normalized_email,
            pending["password_hash"],
        )
        db.commit()
        return account
    except (InvalidRegistrationCodeError, AccountAlreadyExistsError):
        raise
    except IntegrityError as exc:
        db.rollback()
        raise AccountAlreadyExistsError from exc
    except AuthenticationSetupError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while verifying registration email")
        raise AuthenticationSetupError(
            "Unable to verify your email right now. Please try again."
        ) from exc


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> dict:
    normalized_email = email.strip().lower()

    try:
        # Check the existing Owner/manager/staff authentication table first.
        auth_user = repository.get_user_by_email(db, normalized_email)

        if auth_user:
            password_valid = verify_password(password, auth_user["password_hash"])

            if (
                not auth_user["is_active"]
                or auth_user["is_deleted"]
                or not password_valid
            ):
                raise InvalidCredentialsError

            return auth_user

        # If not found, check the existing StockWise users table.
        user = user_repository.get_user_by_email(db, normalized_email)

    except SQLAlchemyError as exc:
        logger.exception("Database error while looking up login account")
        raise AuthenticationSetupError(
            "Unable to authenticate right now. Please try again."
        ) from exc

    password_hash = user["password_hash"] if user else _DUMMY_HASH
    password_valid = verify_password(password, password_hash)

    if not user or user["is_deleted"] or not password_valid:
        raise InvalidCredentialsError

    return user


def authenticate_google_user(db: Session, credential: str, nonce: str) -> dict:
    if not settings.google_client_id:
        raise AuthenticationSetupError("Google sign-in is not configured.")
    try:
        claims = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.google_client_id
        )
    except Exception as exc:
        raise InvalidGoogleCredentialError from exc

    email = claims.get("email")
    name = claims.get("name")
    if (
        claims.get("nonce") != nonce
        or claims.get("email_verified") is not True
        or not isinstance(email, str)
        or not isinstance(name, str)
        or not email.strip()
    ):
        raise InvalidGoogleCredentialError

    try:
        normalized_email = email.strip().lower()
        account = repository.get_user_by_email(db, normalized_email)
        if account:
            if not account["is_active"] or account["is_deleted"]:
                raise InvalidGoogleCredentialError
            return account
        legacy = user_repository.get_user_by_email(db, normalized_email)
        if legacy:
            if legacy["is_deleted"]:
                raise InvalidGoogleCredentialError
            return legacy
        try:
            return register_account(
                db,
                name=name.strip()[:160] or normalized_email,
                email=normalized_email,
                password=secrets.token_urlsafe(48),
            )
        except AccountAlreadyExistsError:
            account = repository.get_user_by_email(db, normalized_email)
            if account and account["is_active"] and not account["is_deleted"]:
                return account
            legacy = user_repository.get_user_by_email(db, normalized_email)
            if legacy and not legacy["is_deleted"]:
                return legacy
            raise InvalidGoogleCredentialError
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error during Google account lookup or creation")
        raise AuthenticationSetupError(
            "Unable to sign in with Google right now. Please try again."
        ) from exc


def request_password_reset(db: Session, email: str) -> tuple[str, str] | None:
    if not settings.smtp_username or not settings.smtp_app_password:
        raise AuthenticationSetupError("Password reset email is not configured.")

    normalized_email = email.strip().lower()
    try:
        account = repository.get_user_by_email(db, normalized_email)
        account_table = "auth_users"
        if account:
            if not account["is_active"] or account["is_deleted"]:
                return None
        else:
            account = user_repository.get_user_by_email(db, normalized_email)
            account_table = "users"
            if not account or account["is_deleted"]:
                return None

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        repository.store_password_reset(db, normalized_email, account_table, token_hash)
        db.commit()
        return normalized_email, token
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while preparing password reset")
        raise AuthenticationSetupError(
            "Unable to process the password reset request right now."
        ) from exc


def send_password_reset_email(email: str, token: str) -> None:
    reset_url = (
        f"{settings.client_url.rstrip('/')}/reset-password?token="
        f"{quote(token)}"
    )
    message = EmailMessage()
    message["Subject"] = "Reset your StockWise password"
    message["To"] = email
    message.set_content(
        "We received a request to reset your StockWise password.\n\n"
        f"Use this link within 30 minutes: {reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    _send_email(
        message,
        "Unable to send a password reset email.",
        "Password reset email was skipped because SMTP is not configured.",
    )


def send_registration_verification_email(email: str, code: str) -> None:
    message = EmailMessage()
    message["Subject"] = "Verify your StockWise email"
    message["To"] = email.strip().lower()
    message.set_content(
        "Use this 8-digit code to verify your email and create your StockWise account:\n\n"
        f"{code}\n\n"
        "This code expires in 10 minutes. Your StockWise password is separate from your Gmail password."
    )
    _send_email(
        message,
        "Unable to send a StockWise registration verification email.",
        "Email verification is not configured.",
        required=True,
    )


def send_login_alert_email(email: str) -> None:
    message = EmailMessage()
    message["Subject"] = "New device signed in to StockWise"
    message["To"] = email.strip().lower()
    signed_in_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    message.set_content(
        "Your StockWise account was accessed from a device or browser that has not signed in before.\n\n"
        f"Time: {signed_in_at}\n\n"
        "If this was not you, change your password and review your account security settings."
    )
    _send_email(
        message,
        "Unable to send a StockWise login alert email.",
        "Login alert email is enabled, but SMTP is not configured.",
    )


def _send_email(
    message: EmailMessage,
    failure_message: str,
    unavailable_message: str,
    required: bool = False,
) -> None:
    if not settings.smtp_username or not settings.smtp_app_password:
        if required:
            raise AuthenticationSetupError(unavailable_message)
        logger.warning(unavailable_message)
        return
    message["From"] = settings.smtp_username
    message.replace_header("To", str(message["To"]).strip().lower())
    smtp_password = settings.smtp_app_password.replace(" ", "")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            smtp.login(settings.smtp_username, smtp_password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException):
        logger.exception(failure_message)
        if required:
            raise AuthenticationSetupError(failure_message)


def reset_password(db: Session, token: str, new_password: str) -> bool:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    updated = repository.consume_password_reset(
        db, token_hash, hash_password(new_password)
    )
    if updated:
        db.commit()
    else:
        db.rollback()
    return updated
