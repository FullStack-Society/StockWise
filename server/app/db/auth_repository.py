
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.auth_models import AuthUser


def get_user_by_email(db: Session, email: str) -> AuthUser | None:
    normalized_email = email.strip().lower()
    return db.scalar(
        select(AuthUser).where(AuthUser.email == normalized_email)
    )


def create_owner(
    db: Session,
    name: str,
    email: str,
    password_hash: str,
) -> AuthUser:
    user = AuthUser(
        name=name,
        email=email.strip().lower(),
        password_hash=password_hash,
        role="owner",
    )
    db.add(user)
    db.flush()
    return user


def create_account(
    db: Session,
    name: str,
    email: str,
    password_hash: str,
) -> AuthUser:
    user = AuthUser(
        name=name.strip(),
        email=email.strip().lower(),
        password_hash=password_hash,
        role="staff",
    )
    db.add(user)
    db.flush()
    return user


def owner_exists(db: Session) -> bool:
    owner_id = db.scalar(
        select(AuthUser.id)
        .where(AuthUser.role == "owner")
        .limit(1)
    )
    return owner_id is not None
