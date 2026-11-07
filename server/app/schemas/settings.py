from typing import Literal

from pydantic import BaseModel, EmailStr, Field


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
