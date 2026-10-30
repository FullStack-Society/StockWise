
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
