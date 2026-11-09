import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import auth_repository, user_repository
from app.services.auth_service import AuthenticationSetupError


class InvalidTwoFactorCodeError(Exception):
    pass


def _fernet() -> MultiFernet:
    keys: list[bytes] = []
    configured_keys = settings.totp_encryption_keys
    try:
        if configured_keys:
            keys.extend(
                key.strip().encode("ascii")
                for key in configured_keys.split(",")
                if key.strip()
            )
    except UnicodeEncodeError as exc:
        raise AuthenticationSetupError(
            "TOTP_ENCRYPTION_KEYS must contain valid URL-safe Fernet keys."
        ) from exc
    # Retain compatibility with secrets encrypted before the dedicated key
    # setting existed. Keep the internal key unchanged until this legacy key is
    # explicitly retained in TOTP_ENCRYPTION_KEYS during rotation.
    if not settings.internal_api_key or len(settings.internal_api_key) < 32:
        if not keys:
            raise AuthenticationSetupError(
                "Two-factor authentication requires TOTP_ENCRYPTION_KEYS or a configured internal API key."
            )
    else:
        legacy = base64.urlsafe_b64encode(hashlib.sha256(
            (settings.internal_api_key + "|stockwise-totp-secret-v1").encode("utf-8")
        ).digest())
        if legacy not in keys:
            keys.append(legacy)

    try:
        unique_keys = list(dict.fromkeys(keys))
        return MultiFernet([Fernet(key) for key in unique_keys])
    except (ValueError, TypeError) as exc:
        raise AuthenticationSetupError(
            "TOTP_ENCRYPTION_KEYS must contain valid URL-safe Fernet keys."
        ) from exc


def _encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode("ascii")).decode("ascii")


def _decrypt_secret(ciphertext: str | None) -> str:
    if not ciphertext:
        raise InvalidTwoFactorCodeError
    try:
        return _fernet().decrypt(ciphertext.encode("ascii")).decode("ascii")
    except (InvalidToken, UnicodeDecodeError) as exc:
        raise AuthenticationSetupError(
            "The authenticator secret cannot be decrypted. Check the internal API key."
        ) from exc


def _new_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _totp(secret: str, timestamp: int) -> str:
    key = base64.b32decode(secret + "=" * ((8 - len(secret) % 8) % 8))
    counter = int(timestamp // 30)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{binary % 1_000_000:06d}"


def _matching_totp_step(secret: str, code: str) -> int | None:
    normalized = "".join(character for character in code if character.isdigit())
    if len(normalized) != 6:
        return None
    current_step = int(time.time()) // 30
    for step in (current_step - 1, current_step, current_step + 1):
        if hmac.compare_digest(_totp(secret, step * 30), normalized):
            return step
    return None


def _valid_totp(secret: str, code: str) -> bool:
    return _matching_totp_step(secret, code) is not None


def _recovery_hash(code: str) -> str:
    normalized = code.replace("-", "").strip().upper()
    return hashlib.sha256(normalized.encode("ascii")).hexdigest()


def begin_enrollment(db: Session, email: str) -> dict:
    current = auth_repository.get_authenticator(db, email)
    if current and current["enabled"]:
        raise InvalidTwoFactorCodeError
    secret = _new_secret()
    auth_repository.save_pending_authenticator(db, email, _encrypt_secret(secret))
    db.commit()
    account = quote(email.strip().lower(), safe="")
    issuer = quote("StockWise", safe="")
    uri = f"otpauth://totp/{issuer}:{account}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"
    return {"secret": secret, "otpauth_uri": uri}


def confirm_enrollment(db: Session, email: str, code: str) -> list[str]:
    current = auth_repository.get_authenticator(db, email)
    secret = _decrypt_secret(current.get("pending_secret_ciphertext") if current else None)
    accepted_step = _matching_totp_step(secret, code)
    if accepted_step is None:
        raise InvalidTwoFactorCodeError

    recovery_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    auth_repository.enable_authenticator(
        db,
        email,
        _encrypt_secret(secret),
        [_recovery_hash(value) for value in recovery_codes],
        accepted_step,
    )
    db.commit()
    return [f"{code[:4]}-{code[4:]}" for code in recovery_codes]


def disable_authenticator(db: Session, email: str, code: str) -> None:
    current = auth_repository.get_authenticator(db, email)
    if not current or not current["enabled"]:
        raise InvalidTwoFactorCodeError
    secret = _decrypt_secret(current.get("secret_ciphertext"))
    if not auth_repository.mfa_disable_allowed(db, email):
        db.rollback()
        raise InvalidTwoFactorCodeError
    accepted_step = _matching_totp_step(secret, code)
    valid = accepted_step is not None and auth_repository.accept_totp_step(
        db, email, accepted_step
    )
    if not valid:
        try:
            valid = auth_repository.consume_recovery_code(
                db, email, _recovery_hash(code)
            )
        except (UnicodeEncodeError, ValueError):
            valid = False
    if not valid:
        auth_repository.fail_mfa_disable(db, email)
        db.commit()
        raise InvalidTwoFactorCodeError
    auth_repository.remove_authenticator(db, email)
    db.commit()


def authenticator_enabled(db: Session, email: str) -> bool:
    current = auth_repository.get_authenticator(db, email)
    return bool(current and current["enabled"])


def create_login_challenge(db: Session, email: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    auth_repository.create_mfa_challenge(db, email, token_hash)
    db.commit()
    return token


def verify_login_challenge(db: Session, token: str, code: str) -> dict | None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    challenge = auth_repository.get_mfa_challenge(db, token_hash)
    if not challenge:
        return None
    email = challenge["email"]
    current = auth_repository.get_authenticator(db, email)
    if not current or not current["enabled"]:
        auth_repository.consume_mfa_challenge(db, token_hash)
        db.commit()
        return None

    secret = _decrypt_secret(current.get("secret_ciphertext"))
    accepted_step = _matching_totp_step(secret, code)
    valid = accepted_step is not None and auth_repository.accept_totp_step(
        db, email, accepted_step
    )
    if not valid:
        try:
            code_hash = _recovery_hash(code)
            valid = auth_repository.consume_recovery_code(db, email, code_hash)
        except (UnicodeEncodeError, ValueError):
            valid = False
    if not valid:
        auth_repository.increment_mfa_challenge_attempt(db, token_hash)
        db.commit()
        return None

    auth_repository.consume_mfa_challenge(db, token_hash)
    account = auth_repository.get_user_by_email(db, email)
    if account:
        if not account["is_active"] or account["is_deleted"]:
            db.rollback()
            return None
    else:
        account = user_repository.get_user_by_email(db, email)
        if not account or account["is_deleted"]:
            db.rollback()
            return None
    db.commit()
    return account
