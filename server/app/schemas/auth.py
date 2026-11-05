from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegistrationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


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
    user: AuthenticatedUser
