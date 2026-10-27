import hashlib
import hmac
import logging
import os

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models.auth_models import AuthUser
from app.db import auth_repository as repository
from app.db.session import Base, engine
from app.db import user_repository
from app.db.models.user_models import User

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


class AuthenticationSetupError(Exception):
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


def initialize_auth() -> None:
    """Create the auth table and seed the configured owner once."""
    Base.metadata.create_all(bind=engine, tables=[AuthUser.__table__])


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
) -> AuthUser:
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
        raise AccountAlreadyExistsError from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise AuthenticationSetupError(
            "Unable to create the account right now. Please try again."
        ) from exc



def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> AuthUser | User:
    normalized_email = email.strip().lower()

    try:
        # Check the existing Owner/admin/staff authentication table first.
        auth_user = repository.get_user_by_email(db, normalized_email)

        if auth_user:
            password_valid = verify_password(
                password,
                auth_user.password_hash,
            )

            if not auth_user.is_active or auth_user.is_deleted or not password_valid:
                raise InvalidCredentialsError

            return auth_user

        # If not found, check the existing StockWise users table.
        user = user_repository.get_user_by_email(db, normalized_email)

    except SQLAlchemyError as exc:
        logger.exception("Database error while looking up login account")
        raise AuthenticationSetupError(
            "Unable to authenticate right now. Please try again."
        ) from exc

    password_hash = user.password_hash if user else _DUMMY_HASH
    password_valid = verify_password(password, password_hash)

    if not user or user.is_deleted or not password_valid:
        raise InvalidCredentialsError

    return user

