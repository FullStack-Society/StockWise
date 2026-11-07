from typing import Literal
import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    device_id: str | None = Field(default=None, min_length=32, max_length=128)


def validate_password_strength(value: str) -> str:
    if len(value) < 12:
        raise ValueError("Password must be at least 12 characters.")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one capital letter.")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("Password must contain at least one special character.")
    return value


class RegistrationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class GoogleCredentialRequest(BaseModel):
    credential: str = Field(min_length=1, max_length=8192)
    nonce: str = Field(min_length=16, max_length=128)
    device_id: str | None = Field(default=None, min_length=32, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=32, max_length=256)
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_reset_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class TwoFactorLoginRequest(BaseModel):
    challenge_token: str = Field(min_length=32, max_length=256)
    code: str = Field(min_length=6, max_length=32)
    device_id: str | None = Field(default=None, min_length=32, max_length=128)


class TwoFactorCodeRequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class TwoFactorEnrollment(BaseModel):
    secret: str
    otpauth_uri: str


class TwoFactorStatus(BaseModel):
    enabled: bool


class TwoFactorRecoveryCodes(BaseModel):
    recovery_codes: list[str]


class AuthenticatedUser(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Literal["owner", "manager", "staff"]

    @field_validator("role", mode="before")
    @classmethod
    def normalize_legacy_role(cls, value):
        return "manager" if value == "admin" else value


class LoginResponse(BaseModel):
    user: AuthenticatedUser | None = None
    two_factor_required: bool = False
    challenge_token: str | None = None
