from typing import Literal

from pydantic import BaseModel, EmailStr, Field


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
    role: Literal["owner", "admin", "staff"]


class LoginResponse(BaseModel):
    user: AuthenticatedUser
