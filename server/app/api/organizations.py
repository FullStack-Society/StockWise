import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import (
    OrganizationContext,
    require_internal_api_key,
    require_organization_membership,
)
from app.db import organization_repository as repository
from app.db.session import get_db
from app.schemas.organizations import (
    InviteCreate,
    OrganizationCreate,
    InvitationCreateResult,
    InvitationNotice,
    InvitationReply,
    InvitationReplyResult,
    MemberRoleChange,
    OrganizationLeaveNotification,
    OrganizationLoginNotification,
    OrganizationMember,
    OrganizationNameUpdate,
    OwnershipTransfer,
    OrganizationSummary,
)

router = APIRouter(dependencies=[Depends(require_internal_api_key)])
logger = logging.getLogger(__name__)


@router.post("/presence/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
def heartbeat_presence(
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        repository.heartbeat_member_presence(
            db, context.organization_id, context.email
        )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.post("/member-login", status_code=status.HTTP_204_NO_CONTENT)
def notify_member_login(
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        repository.create_member_login_notifications(
            db, context.organization_id, context.email, context.role
        )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.get(
    "/login-notifications",
    response_model=list[OrganizationLoginNotification],
)
def get_login_notifications(
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return repository.list_member_login_notifications(
            db, context.organization_id, context.email, context.role
        )
    except SQLAlchemyError as exc:
        _raise_database_error(exc)


@router.put(
    "/login-notifications/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
)
def mark_login_notification_read(
    notification_id: int,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if context.role not in {"owner", "manager"}:
        raise HTTPException(status_code=403, detail="You cannot access this notification.")
    try:
        marked = repository.mark_member_login_notification_read(
            db, context.organization_id, context.email, notification_id
        )
        if not marked:
            db.rollback()
            raise HTTPException(status_code=404, detail="Notification not found.")
        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


def _raise_database_error(exc: SQLAlchemyError) -> None:
    original = getattr(exc, "orig", None)
    sqlstate = getattr(original, "sqlstate", None)
    if sqlstate == "42501":
        status_code, detail = (
            status.HTTP_403_FORBIDDEN,
            "You are not allowed to do that.",
        )
    elif sqlstate == "P0002":
        status_code, detail = (
            status.HTTP_404_NOT_FOUND,
            "The account or invitation was not found.",
        )
    elif sqlstate == "23505":
        status_code, detail = (
            status.HTTP_409_CONFLICT,
            "This invitation or membership already exists.",
        )
    elif sqlstate == "22023":
        status_code, detail = status.HTTP_422_UNPROCESSABLE_ENTITY, "The request is invalid."
    else:
        diagnostics = getattr(original, "diag", None)
        logger.error(
            "Organization database request failed (sqlstate=%s, constraint=%s, error_type=%s)",
            sqlstate or "unknown",
            getattr(diagnostics, "constraint_name", None) or "unknown",
            type(original).__name__ if original is not None else type(exc).__name__,
        )
        status_code, detail = (
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Unable to complete the organization request.",
        )
    raise HTTPException(status_code=status_code, detail=detail) from exc


@router.post("/", response_model=OrganizationSummary, status_code=status.HTTP_201_CREATED)
def create_organization(request: OrganizationCreate, db: Session = Depends(get_db)):
    try:
        organization = repository.create_organization(
            db,
            str(request.email).strip().lower(),
            request.organization_name,
        )
        db.commit()
        return organization
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.get("/mine", response_model=list[OrganizationSummary])
def get_my_organizations(
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        return repository.get_organizations(db, email.strip().lower())
    except SQLAlchemyError as exc:
        _raise_database_error(exc)


@router.get(
    "/notifications",
    response_model=list[OrganizationLeaveNotification],
)
def get_my_notifications(
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        return repository.get_leave_notifications(db, email.strip().lower())
    except SQLAlchemyError as exc:
        _raise_database_error(exc)


@router.put(
    "/notifications/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
)
def mark_notification_read(
    notification_id: int,
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        marked = repository.mark_leave_notification_read(
            db, notification_id, email.strip().lower()
        )
        if not marked:
            db.rollback()
            raise HTTPException(
                status_code=404, detail="Notification was not found."
            )
        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.delete(
    "/notifications/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_notification(
    notification_id: int,
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        deleted = repository.delete_leave_notification(
            db, notification_id, email.strip().lower()
        )
        if not deleted:
            db.rollback()
            raise HTTPException(
                status_code=404, detail="Notification was not found."
            )
        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.put("/{organization_id}", response_model=OrganizationSummary)
def update_organization_name(
    organization_id: int,
    request: OrganizationNameUpdate,
    db: Session = Depends(get_db),
):
    actor_email = str(request.actor_email).strip().lower()
    name = request.organization_name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Enter an organization name.")

    try:
        row = repository.rename_organization(
            db, organization_id, actor_email, name
        )
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Organization not found.")
        db.commit()
        return row
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.post(
    "/{organization_id}/transfer-ownership",
    status_code=status.HTTP_204_NO_CONTENT,
)
def transfer_organization_ownership(
    organization_id: int,
    request: OwnershipTransfer,
    db: Session = Depends(get_db),
):
    try:
        transferred = repository.transfer_ownership(
            db,
            organization_id,
            str(request.actor_email),
            str(request.target_email),
        )
        if not transferred:
            db.rollback()
            raise HTTPException(status_code=404, detail="Organization member not found.")
        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.delete("/{organization_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    organization_id: int,
    actor_email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        deleted = repository.delete_organization(
            db, organization_id, actor_email.strip().lower()
        )
        if not deleted:
            db.rollback()
            raise HTTPException(status_code=404, detail="Organization not found.")
        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.get("/invitations", response_model=list[InvitationNotice])
def get_my_invitations(
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        return repository.get_pending_invitations(db, email.strip().lower())
    except SQLAlchemyError as exc:
        _raise_database_error(exc)


@router.post(
    "/invitations/{invitation_id}/respond",
    response_model=InvitationReplyResult,
)
def respond_to_invitation(
    invitation_id: int,
    reply: InvitationReply,
    db: Session = Depends(get_db),
):
    try:
        result = repository.respond_to_invitation(
            db,
            invitation_id,
            str(reply.email).strip().lower(),
            reply.accept,
        )
        db.commit()
        return result or {}
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.get(
    "/{organization_id}/members",
    response_model=list[OrganizationMember],
)
def list_members(
    organization_id: int,
    actor_email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        return repository.list_members(db, organization_id, actor_email.strip().lower())
    except SQLAlchemyError as exc:
        _raise_database_error(exc)


@router.post(
    "/{organization_id}/invitations",
    response_model=InvitationCreateResult,
    status_code=status.HTTP_201_CREATED,
)
def invite_member(
    organization_id: int,
    request: InviteCreate,
    db: Session = Depends(get_db),
):
    try:
        invitation_id = repository.invite_member(
            db,
            organization_id,
            str(request.actor_email).strip().lower(),
            str(request.email).strip().lower(),
            request.role,
        )
        db.commit()
        return {"invitation_id": invitation_id}
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.delete("/{organization_id}/members/{email}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    organization_id: int,
    email: str,
    actor_email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        removed = repository.remove_member(
            db, organization_id, actor_email.strip().lower(), email.strip().lower()
        )
        if not removed:
            db.rollback()
            raise HTTPException(status_code=404, detail="Member or invitation not found.")
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.post("/{organization_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_organization(
    organization_id: int,
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        left = repository.leave_organization(db, organization_id, email.strip().lower())
        if not left:
            db.rollback()
            raise HTTPException(status_code=404, detail="Organization membership not found.")
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)


@router.put("/{organization_id}/members/{email}/role", status_code=status.HTTP_204_NO_CONTENT)
def change_member_role(
    organization_id: int,
    email: str,
    request: MemberRoleChange,
    db: Session = Depends(get_db),
):
    try:
        changed = repository.change_member_role(
            db,
            organization_id,
            str(request.actor_email).strip().lower(),
            email.strip().lower(),
            request.role,
        )
        if not changed:
            db.rollback()
            raise HTTPException(status_code=404, detail="Organization member not found.")
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc)
