from sqlalchemy import text
from sqlalchemy.orm import Session


def get_organizations(db: Session, email: str) -> list[dict]:
    result = db.execute(
        text("SELECT * FROM public.org_get_my_organizations(:p_email)"),
        {"p_email": email},
    )
    return [dict(row) for row in result.mappings().all()]


def create_organization(db: Session, email: str, organization_name: str) -> dict:
    result = db.execute(
        text("""
            SELECT * FROM public.org_create_organization(
                :p_email, :p_organization_name
            )
        """),
        {"p_email": email, "p_organization_name": organization_name},
    )
    return dict(result.mappings().one())


def get_pending_invitations(db: Session, email: str) -> list[dict]:
    result = db.execute(
        text("SELECT * FROM public.org_get_pending_invitations(:p_email)"),
        {"p_email": email},
    )
    return [dict(row) for row in result.mappings().all()]


def respond_to_invitation(
    db: Session, invitation_id: int, email: str, accept: bool
) -> dict | None:
    result = db.execute(
        text("""
            SELECT * FROM public.org_respond_to_invitation(
                :p_invitation_id, :p_email, :p_accept
            )
        """),
        {
            "p_invitation_id": invitation_id,
            "p_email": email,
            "p_accept": accept,
        },
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def list_members(db: Session, organization_id: int, actor_email: str) -> list[dict]:
    result = db.execute(
        text("""
            SELECT * FROM public.org_list_members(
                :p_organization_id, :p_actor_email
            )
        """),
        {"p_organization_id": organization_id, "p_actor_email": actor_email},
    )
    return [dict(row) for row in result.mappings().all()]


def invite_member(
    db: Session, organization_id: int, actor_email: str, email: str, role: str
) -> int:
    result = db.execute(
        text("""
            SELECT public.org_invite_member(
                :p_organization_id, :p_actor_email, :p_email, :p_role
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_actor_email": actor_email,
            "p_email": email,
            "p_role": role,
        },
    )
    return int(result.scalar_one())


def remove_member(
    db: Session, organization_id: int, actor_email: str, target_email: str
) -> bool:
    result = db.execute(
        text("""
            SELECT public.org_remove_member(
                :p_organization_id, :p_actor_email, :p_target_email
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_actor_email": actor_email,
            "p_target_email": target_email,
        },
    )
    return bool(result.scalar_one())


def leave_organization(db: Session, organization_id: int, email: str) -> bool:
    result = db.execute(
        text("SELECT public.org_leave(:p_organization_id, :p_email)"),
        {"p_organization_id": organization_id, "p_email": email},
    )
    return bool(result.scalar_one())


def change_member_role(
    db: Session,
    organization_id: int,
    actor_email: str,
    target_email: str,
    role: str,
) -> bool:
    result = db.execute(
        text("""
            SELECT public.org_change_member_role(
                :p_organization_id, :p_actor_email, :p_target_email, :p_new_role
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_actor_email": actor_email,
            "p_target_email": target_email,
            "p_new_role": role,
        },
    )
    return bool(result.scalar_one())
