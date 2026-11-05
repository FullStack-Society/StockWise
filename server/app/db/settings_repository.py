from sqlalchemy import text
from sqlalchemy.orm import Session


def get_settings(db: Session, email: str) -> dict | None:
    result = db.execute(
        text("SELECT * FROM public.stockwise_settings_get(:email)"),
        {"email": email.strip().lower()},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def update_profile(
    db: Session, email: str, name: str, timezone: str
) -> dict | None:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_settings_update_profile(
                :email, :name, :timezone
            )
        """),
        {
            "email": email.strip().lower(),
            "name": name,
            "timezone": timezone,
        },
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def update_preferences(db: Session, email: str, preferences: dict) -> dict | None:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_settings_update_preferences(
                :email, :invitation_notifications, :theme, :date_format,
                :currency, :density, :auto_sync_reports, :prioritize_low_stock
            )
        """),
        {"email": email.strip().lower(), **preferences},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def get_password_account(db: Session, email: str) -> dict | None:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_settings_get_password_account(:email)
        """),
        {"email": email.strip().lower()},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def update_password(
    db: Session, email: str, account_table: str, password_hash: str
) -> bool:
    return bool(
        db.execute(
            text("""
                SELECT public.stockwise_settings_update_password(
                    :email, :account_table, :password_hash
                )
            """),
            {
                "email": email.strip().lower(),
                "account_table": account_table,
                "password_hash": password_hash,
            },
        ).scalar_one()
    )


def delete_account(db: Session, email: str) -> dict:
    result = db.execute(
        text("SELECT * FROM public.stockwise_settings_delete_account(:email)"),
        {"email": email.strip().lower()},
    )
    return dict(result.mappings().one())
