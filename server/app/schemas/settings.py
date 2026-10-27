from pydantic import BaseModel, EmailStr, Field


class ProfileSettings(BaseModel):
    email: EmailStr
    name: str
    position: str
    timezone: str
    invitation_notifications: bool


class ProfileSettingsUpdate(BaseModel):
    timezone: str = Field(min_length=1, max_length=80)


class PreferencesUpdate(BaseModel):
    invitation_notifications: bool
