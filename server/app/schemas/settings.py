import base64
import binascii
import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class ProfileSettings(BaseModel):
    email: EmailStr
    name: str
    position: str
    timezone: str
    invitation_notifications: bool
    theme: Literal["dark", "light", "system"]
    date_format: Literal["mdy", "dmy", "ymd"]
    currency: Literal["USD", "PHP", "EUR"]
    density: Literal["comfortable", "compact"]
    auto_sync_reports: bool
    prioritize_low_stock: bool
    avatar_data: str | None = None


class AvatarUpdate(BaseModel):
    avatar_data: str | None = Field(max_length=900_000)

    @field_validator("avatar_data")
    @classmethod
    def validate_avatar_data(cls, value: str | None) -> str | None:
        if value is None:
            return None
        match = re.fullmatch(
            r"data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})",
            value,
        )
        if not match:
            raise ValueError("Use a JPEG, PNG, or WebP image.")
        try:
            image_bytes = base64.b64decode(match.group(2), validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("The image data is invalid.") from exc
        if len(image_bytes) > 650_000:
            raise ValueError("The resized image must be 650 KB or smaller.")
        mime_type = match.group(1)
        valid_signature = (
            image_bytes.startswith(b"\xff\xd8\xff")
            if mime_type == "image/jpeg"
            else image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
            if mime_type == "image/png"
            else len(image_bytes) >= 12
            and image_bytes.startswith(b"RIFF")
            and image_bytes[8:12] == b"WEBP"
        )
        if not valid_signature:
            raise ValueError("The image data does not match its file type.")
        return value


class AvatarResponse(BaseModel):
    avatar_data: str | None


class ProfileSettingsUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    timezone: Literal[
        "Asia/Manila",
        "Asia/Singapore",
        "America/Los_Angeles",
        "America/Chicago",
        "America/New_York",
        "Europe/London",
        "Europe/Berlin",
        "UTC",
    ]


class PreferencesUpdate(BaseModel):
    invitation_notifications: bool
    theme: Literal["dark", "light", "system"]
    date_format: Literal["mdy", "dmy", "ymd"]
    currency: Literal["USD", "PHP", "EUR"]
    density: Literal["comfortable", "compact"]
    auto_sync_reports: bool
    prioritize_low_stock: bool


class UsageAnalyticsConsent(BaseModel):
    enabled: bool


class AccountSecurityStatus(BaseModel):
    two_factor_enabled: bool
    google_account_connected: bool


class InventoryDefaults(BaseModel):
    default_reorder_point: int = Field(ge=0, le=2_147_483_647)


class InventoryDefaultsUpdate(BaseModel):
    default_reorder_point: int = Field(ge=0, le=2_147_483_647)


class SecurityPrivacyPreferences(BaseModel):
    login_alert_emails: bool
    auto_sign_out_idle: bool


class SecurityPrivacyPreferencesUpdate(BaseModel):
    login_alert_emails: bool
    auto_sign_out_idle: bool


class UsageAnalyticsPageView(BaseModel):
    page: Literal["dashboard", "inventory", "orders", "reports", "settings", "users"]


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)
