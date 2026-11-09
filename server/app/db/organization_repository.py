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


def rename_organization(
    db: Session, organization_id: int, actor_email: str, organization_name: str
) -> dict | None:
    result = db.execute(
        text("""
            SELECT * FROM public.org_rename_organization(
                :p_organization_id, :p_actor_email, :p_organization_name
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_actor_email": actor_email,
            "p_organization_name": organization_name,
        },
    )
    row = result.mappings().first()
    return dict(row) if row is not None else None


def transfer_ownership(
    db: Session, organization_id: int, actor_email: str, target_email: str
) -> bool:
    result = db.execute(
        text("""
            SELECT public.org_transfer_ownership(
                :p_organization_id, :p_actor_email, :p_target_email
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_actor_email": actor_email.strip().lower(),
            "p_target_email": target_email.strip().lower(),
        },
    )
    return bool(result.scalar_one())


def delete_organization(db: Session, organization_id: int, actor_email: str) -> bool:
    result = db.execute(
        text("""
            SELECT public.org_delete_organization(
                :p_organization_id, :p_actor_email
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_actor_email": actor_email.strip().lower(),
        },
    )
    return bool(result.scalar_one())


def get_pending_invitations(db: Session, email: str) -> list[dict]:
    result = db.execute(
        text("SELECT * FROM public.org_get_pending_invitations(:p_email)"),
        {"p_email": email},
    )
    return [dict(row) for row in result.mappings().all()]


def get_leave_notifications(db: Session, email: str) -> list[dict]:
    result = db.execute(
        text("SELECT * FROM public.org_get_leave_notifications(:p_email)"),
        {"p_email": email},
    )
    return [dict(row) for row in result.mappings().all()]


def mark_leave_notification_read(
    db: Session, notification_id: int, email: str
) -> bool:
    result = db.execute(
        text("""
            SELECT public.org_mark_leave_notification_read(
                :p_notification_id, :p_email
            )
        """),
        {"p_notification_id": notification_id, "p_email": email},
    )
    return bool(result.scalar_one())


def delete_leave_notification(
    db: Session, notification_id: int, email: str
) -> bool:
    result = db.execute(
        text("""
            SELECT public.org_delete_leave_notification(
                :p_notification_id, :p_email
            )
        """),
        {"p_notification_id": notification_id, "p_email": email},
    )
    return bool(result.scalar_one())


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
    members = [dict(row) for row in result.mappings().all()]
    presence = db.execute(
        text("""
            SELECT lower(email) AS email,
                   last_seen_at >= CURRENT_TIMESTAMP - interval '90 seconds' AS online
            FROM public.organization_member_presence
            WHERE organization_id = :organization_id
        """),
        {"organization_id": organization_id},
    ).mappings().all()
    online_by_email = {row["email"]: bool(row["online"]) for row in presence}
    for member in members:
        member["online_status"] = (
            None
            if member["status"] == "Invited"
            else "Active"
            if online_by_email.get(member["email"].lower(), False)
            else "Offline"
        )
    return members


def heartbeat_member_presence(db: Session, organization_id: int, email: str) -> None:
    db.execute(
        text("""
            INSERT INTO public.organization_member_presence (
                organization_id, email, last_seen_at
            ) VALUES (:organization_id, lower(:email), CURRENT_TIMESTAMP)
            ON CONFLICT (organization_id, email)
            DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP
        """),
        {"organization_id": organization_id, "email": email.strip().lower()},
    )


def create_member_login_notifications(
    db: Session, organization_id: int, actor_email: str, actor_role: str
) -> int:
    if actor_role == "owner" or actor_role not in {"manager", "staff"}:
        return 0
    result = db.execute(
        text("""
            INSERT INTO public.organization_member_login_notifications (
                organization_id, recipient_email, actor_email, actor_name, actor_role
            )
            SELECT :organization_id, recipient.email, lower(:actor_email),
                   COALESCE(
                       (SELECT account.name FROM public.auth_users AS account
                        WHERE lower(account.email) = lower(:actor_email)
                        ORDER BY account.id LIMIT 1),
                       (SELECT legacy.full_name FROM public.users AS legacy
                        WHERE lower(legacy.email) = lower(:actor_email)
                        ORDER BY legacy.user_id LIMIT 1),
                       split_part(lower(:actor_email), '@', 1)
                   ),
                   :actor_role
            FROM public.organization_memberships AS recipient
            WHERE recipient.organization_id = :organization_id
              AND recipient.status = 'active'
              AND recipient.role IN ('owner', 'manager')
              AND lower(recipient.email) <> lower(:actor_email)
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.organization_member_login_notifications AS recent
                  WHERE recent.organization_id = recipient.organization_id
                    AND lower(recent.recipient_email) = lower(recipient.email)
                    AND lower(recent.actor_email) = lower(:actor_email)
                    AND recent.created_at >= CURRENT_TIMESTAMP - interval '15 minutes'
              )
        """),
        {
            "organization_id": organization_id,
            "actor_email": actor_email.strip().lower(),
            "actor_role": actor_role,
        },
    )
    return result.rowcount or 0


def list_member_login_notifications(
    db: Session, organization_id: int, email: str, role: str
) -> list[dict]:
    if role not in {"owner", "manager"}:
        return []
    rows = db.execute(
        text("""
            SELECT notification_id, organization_id, actor_name, actor_role,
                   created_at, read_at
            FROM public.organization_member_login_notifications
            WHERE organization_id = :organization_id
              AND lower(recipient_email) = lower(:email)
              AND created_at >= CURRENT_TIMESTAMP - interval '30 days'
            ORDER BY created_at DESC
            LIMIT 50
        """),
        {"organization_id": organization_id, "email": email.strip().lower()},
    ).mappings().all()
    return [dict(row) for row in rows]


def mark_member_login_notification_read(
    db: Session, organization_id: int, email: str, notification_id: int
) -> bool:
    result = db.execute(
        text("""
            UPDATE public.organization_member_login_notifications
            SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE notification_id = :notification_id
              AND organization_id = :organization_id
              AND lower(recipient_email) = lower(:email)
            RETURNING notification_id
        """),
        {
            "notification_id": notification_id,
            "organization_id": organization_id,
            "email": email.strip().lower(),
        },
    ).scalar_one_or_none()
    return result is not None


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
