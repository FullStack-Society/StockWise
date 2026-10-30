
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_user_by_email(db: Session, email: str) -> dict | None:
    result = db.execute(
        text("SELECT * FROM public.stockwise_auth_get_legacy_user(:email)"),
        {"email": email.strip().lower()},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None
