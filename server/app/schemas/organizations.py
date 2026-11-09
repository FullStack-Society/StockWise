from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


OrganizationRole = Literal["owner", "manager", "staff"]
InviteRole = Literal["manager", "staff"]


class OrganizationSummary(BaseModel):
    organization_id: int
    organization_name: str
    role: OrganizationRole

    @field_validator("role", mode="before")
    @classmethod
    def normalize_legacy_role(cls, value):
        return "manager" if value == "admin" else value


class OrganizationCreate(BaseModel):
    email: EmailStr
    organization_name: str


class OrganizationNameUpdate(BaseModel):
    actor_email: EmailStr
    organization_name: str = Field(min_length=1, max_length=160)


class OwnershipTransfer(BaseModel):
    actor_email: EmailStr
    target_email: EmailStr


class InvitationNotice(BaseModel):
    invitation_id: int
    organization_id: int
    organization_name: str
    role: InviteRole
    invited_by_email: str
    created_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def normalize_legacy_role(cls, value):
        return "manager" if value == "admin" else value


class InvitationReply(BaseModel):
    email: EmailStr
    accept: bool


class InvitationReplyResult(BaseModel):
    organization_id: int | None = None
    organization_name: str | None = None
    role: OrganizationRole | None = None

    @field_validator("role", mode="before")
    @classmethod
    def normalize_legacy_role(cls, value):
        return "manager" if value == "admin" else value


class InviteCreate(BaseModel):
    actor_email: EmailStr
    email: EmailStr
    role: InviteRole


class OrganizationMember(BaseModel):
    email: str
    full_name: str
    role: OrganizationRole
    status: Literal["Active", "Invited"]
    online_status: Literal["Active", "Offline"] | None = None
    joined_at: datetime | None

    @field_validator("role", mode="before")
    @classmethod
    def normalize_legacy_role(cls, value):
        return "manager" if value == "admin" else value


class OrganizationLeaveNotification(BaseModel):
    notification_id: int
    organization_id: int
    organization_name: str
    actor_email: str
    actor_name: str
    created_at: datetime
    read_at: datetime | None


class OrganizationLoginNotification(BaseModel):
    notification_id: int
    organization_id: int
    actor_name: str
    actor_role: OrganizationRole
    created_at: datetime
    read_at: datetime | None


class MemberAction(BaseModel):
    actor_email: EmailStr


class MemberRoleChange(BaseModel):
    actor_email: EmailStr
    role: InviteRole


class LeaveOrganization(BaseModel):
    email: EmailStr


class InvitationCreateResult(BaseModel):
    invitation_id: int
