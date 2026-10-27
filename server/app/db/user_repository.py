
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.user_models import User


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized_email = email.strip().lower()
    return db.scalar(
        select(User).where(User.email == normalized_email)
    )
