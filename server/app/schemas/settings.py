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


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)
