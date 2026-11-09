from sqlalchemy import text
from sqlalchemy.orm import Session

SUPPORTED_TIMEZONES = {
    "Asia/Manila",
    "Asia/Singapore",
    "America/Los_Angeles",
    "America/Chicago",
    "America/New_York",
    "Europe/London",
    "Europe/Berlin",
    "UTC",
}


def get_user_timezone(db: Session, email: str) -> str:
    result = db.execute(
        text("SELECT timezone FROM public.user_settings WHERE lower(email) = lower(:email)"),
        {"email": email.strip().lower()},
    ).scalar_one_or_none()
    return result if result in SUPPORTED_TIMEZONES else "Asia/Manila"


def get_inventory_defaults(db: Session, email: str) -> dict:
    normalized_email = email.strip().lower()
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": normalized_email},
    )
    value = db.execute(
        text("SELECT default_reorder_point FROM public.user_settings WHERE lower(email) = lower(:email)"),
        {"email": normalized_email},
    ).scalar_one()
    return {"default_reorder_point": value}


def update_inventory_defaults(db: Session, email: str, default_reorder_point: int) -> dict:
    normalized_email = email.strip().lower()
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": normalized_email},
    )
    value = db.execute(
        text("""
            UPDATE public.user_settings
            SET default_reorder_point = :default_reorder_point,
                updated_at = CURRENT_TIMESTAMP
            WHERE lower(email) = lower(:email)
            RETURNING default_reorder_point
        """),
        {"email": normalized_email, "default_reorder_point": default_reorder_point},
    ).scalar_one()
    return {"default_reorder_point": value}


def get_security_privacy_preferences(db: Session, email: str) -> dict:
    normalized_email = email.strip().lower()
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": normalized_email},
    )
    row = db.execute(
        text("""
            SELECT login_alert_emails, auto_sign_out_idle
            FROM public.user_settings WHERE lower(email) = lower(:email)
        """),
        {"email": normalized_email},
    ).mappings().one()
    return dict(row)


def update_security_privacy_preferences(
    db: Session, email: str, preferences: dict
) -> dict:
    normalized_email = email.strip().lower()
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": normalized_email},
    )
    row = db.execute(
        text("""
            UPDATE public.user_settings
            SET login_alert_emails = :login_alert_emails,
                auto_sign_out_idle = :auto_sign_out_idle,
                updated_at = CURRENT_TIMESTAMP
            WHERE lower(email) = lower(:email)
            RETURNING login_alert_emails, auto_sign_out_idle
        """),
        {"email": normalized_email, **preferences},
    ).mappings().one()
    if not preferences["login_alert_emails"]:
        db.execute(
            text("DELETE FROM public.auth_login_devices WHERE lower(email) = lower(:email)"),
            {"email": normalized_email},
        )
    return dict(row)


def login_alert_emails_enabled(db: Session, email: str) -> bool:
    result = db.execute(
        text("SELECT login_alert_emails FROM public.user_settings WHERE lower(email) = lower(:email)"),
        {"email": email.strip().lower()},
    ).scalar_one_or_none()
    return bool(result)


def register_login_device(db: Session, email: str, device_hash: str) -> bool:
    normalized_email = email.strip().lower()
    inserted = db.execute(
        text("""
            INSERT INTO public.auth_login_devices (email, device_hash)
            VALUES (:email, :device_hash)
            ON CONFLICT (email, device_hash) DO NOTHING
            RETURNING device_hash
        """),
        {"email": normalized_email, "device_hash": device_hash},
    ).scalar_one_or_none()
    if inserted is not None:
        return True
    db.execute(
        text("""
            UPDATE public.auth_login_devices
            SET last_seen_at = CURRENT_TIMESTAMP
            WHERE email = :email AND device_hash = :device_hash
        """),
        {"email": normalized_email, "device_hash": device_hash},
    )
    return False


def get_settings(db: Session, email: str) -> dict | None:
    result = db.execute(
        text("""
            SELECT settings.*, user_settings.avatar_data
            FROM public.stockwise_settings_get(:email) AS settings
            LEFT JOIN public.user_settings AS user_settings
              ON lower(user_settings.email) = lower(settings.email)
        """),
        {"email": email.strip().lower()},
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def update_avatar(db: Session, email: str, avatar_data: str | None) -> dict:
    normalized_email = email.strip().lower()
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": normalized_email},
    )
    row = db.execute(
        text("""
            UPDATE public.user_settings
            SET avatar_data = :avatar_data, updated_at = CURRENT_TIMESTAMP
            WHERE lower(email) = lower(:email)
            RETURNING avatar_data
        """),
        {"email": normalized_email, "avatar_data": avatar_data},
    ).mappings().one()
    return dict(row)


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


def get_usage_analytics_consent(db: Session, email: str) -> bool:
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": email.strip().lower()},
    )
    result = db.execute(
        text("SELECT usage_analytics FROM public.user_settings WHERE lower(email) = lower(:email)"),
        {"email": email.strip().lower()},
    ).scalar_one_or_none()
    return bool(result)


def update_usage_analytics_consent(db: Session, email: str, enabled: bool) -> bool:
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": email.strip().lower()},
    )
    result = db.execute(
        text("""
            UPDATE public.user_settings
            SET usage_analytics = :enabled, updated_at = CURRENT_TIMESTAMP
            WHERE lower(email) = lower(:email)
            RETURNING usage_analytics
        """),
        {"email": email.strip().lower(), "enabled": enabled},
    ).scalar_one()
    return bool(result)


def is_google_account_connected(db: Session, email: str) -> bool:
    result = db.execute(
        text("""
            SELECT COALESCE(google_account_connected, false)
            FROM public.user_settings WHERE lower(email) = lower(:email)
        """),
        {"email": email.strip().lower()},
    ).scalar_one_or_none()
    return bool(result)


def mark_google_account_connected(db: Session, email: str) -> None:
    normalized_email = email.strip().lower()
    db.execute(
        text("SELECT public.stockwise_settings_ensure(:email)"),
        {"email": normalized_email},
    )
    db.execute(
        text("""
            UPDATE public.user_settings
            SET google_account_connected = true, updated_at = CURRENT_TIMESTAMP
            WHERE lower(email) = lower(:email)
        """),
        {"email": normalized_email},
    )


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
