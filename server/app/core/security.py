import secrets
import hashlib
import hmac
import time
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db


def require_internal_api_key(
    api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
) -> None:
    configured_key = settings.internal_api_key
    if not configured_key or len(configured_key) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The internal API key is not configured securely.",
        )
    if api_key is None or not secrets.compare_digest(api_key, configured_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key.",
        )


def require_signed_actor(
    request: Request,
    email: str = Header(alias="X-User-Email", min_length=3),
    timestamp: str = Header(alias="X-Actor-Timestamp"),
    signature: str = Header(alias="X-Actor-Signature"),
) -> str:
    configured_key = settings.internal_api_key
    try:
        issued_at = int(timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid signed account context.") from exc

    if not configured_key or abs(int(time.time()) - issued_at) > 90:
        raise HTTPException(status_code=401, detail="Expired signed account context.")

    normalized_email = email.strip().lower()
    signed_message = f"{request.method}\n{request.url.path}\n{normalized_email}\n{timestamp}"
    expected = hmac.new(
        configured_key.encode("utf-8"), signed_message.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid signed account context.")
    return normalized_email


@dataclass(frozen=True)
class OrganizationContext:
    organization_id: int
    email: str
    role: str


def require_organization_membership(
    organization_id: int = Header(alias="X-Organization-ID", gt=0),
    email: str = Header(alias="X-User-Email", min_length=3),
    _: None = Depends(require_internal_api_key),
    db: Session = Depends(get_db),
) -> OrganizationContext:
    role = db.execute(
        text("SELECT public.org_get_member_role(:p_organization_id, :p_email)"),
        {"p_organization_id": organization_id, "p_email": email.strip().lower()},
    ).scalar_one_or_none()

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an active member of this organization.",
        )

    return OrganizationContext(
        organization_id=organization_id,
        email=email.strip().lower(),
        role=str(role),
    )
