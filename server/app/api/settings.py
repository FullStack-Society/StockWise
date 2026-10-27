from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import require_internal_api_key, require_signed_actor
from app.db.session import get_db
from app.schemas.settings import (
    PreferencesUpdate,
    ProfileSettings,
    ProfileSettingsUpdate,
)

router = APIRouter(dependencies=[Depends(require_internal_api_key)])

def _ensure_settings(db: Session, email: str) -> None:
    db.execute(
        text("""
            INSERT INTO public.user_settings (email)
            SELECT lower(a.email)
            FROM public.auth_users AS a
            WHERE lower(a.email) = :email AND a.is_active = true
            UNION
            SELECT lower(u.email)
            FROM public.users AS u
            WHERE lower(u.email) = :email AND u.is_deleted = false
              AND NOT EXISTS (
                  SELECT 1 FROM public.auth_users AS a
                  WHERE lower(a.email) = :email
              )
            ON CONFLICT (email) DO NOTHING
        """),
        {"email": email.strip().lower()},
    )


@router.get("/", response_model=ProfileSettings)
def get_settings(email: str = Query(min_length=3), db: Session = Depends(get_db)):
    try:
        _ensure_settings(db, email)
        row = db.execute(
            text("""
                WITH account AS (
                    SELECT a.email, a.name
                    FROM public.auth_users AS a
                    WHERE lower(a.email) = :email AND a.is_active = true
                    UNION ALL
                    SELECT u.email, u.full_name AS name
                    FROM public.users AS u
                    WHERE lower(u.email) = :email AND u.is_deleted = false
                      AND NOT EXISTS (
                          SELECT 1 FROM public.auth_users AS a
                          WHERE lower(a.email) = :email
                      )
                    LIMIT 1
                )
                SELECT a.email, a.name, COALESCE(s.position, '') AS position,
                       COALESCE(s.timezone, 'Asia/Manila') AS timezone,
                       s.invitation_notifications
                FROM account AS a
                LEFT JOIN public.user_settings AS s ON lower(s.email) = lower(a.email)
            """),
            {"email": email.strip().lower()},
        ).mappings().first()
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        db.commit()
        return row
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to load account settings.") from exc


@router.put("/profile", response_model=ProfileSettings)
def update_profile(
    request: ProfileSettingsUpdate,
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        _ensure_settings(db, email)
        row = db.execute(
            text("""
                WITH account AS (
                    SELECT a.email, a.name
                    FROM public.auth_users AS a
                    WHERE lower(a.email) = :email AND a.is_active = true
                    UNION ALL
                    SELECT u.email, u.full_name AS name
                    FROM public.users AS u
                    WHERE lower(u.email) = :email AND u.is_deleted = false
                      AND NOT EXISTS (
                          SELECT 1 FROM public.auth_users AS a
                          WHERE lower(a.email) = :email
                      )
                    LIMIT 1
                )
                UPDATE public.user_settings AS s
                SET timezone = :timezone, updated_at = CURRENT_TIMESTAMP
                FROM account AS a
                WHERE lower(s.email) = lower(a.email)
                RETURNING a.email, a.name, s.position, s.timezone,
                          s.invitation_notifications
            """),
            {
                "email": email.strip().lower(),
                "timezone": request.timezone.strip(),
            },
        ).mappings().first()
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        db.commit()
        return row
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to save profile settings.") from exc


@router.put("/preferences", response_model=ProfileSettings)
def update_preferences(
    request: PreferencesUpdate,
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    try:
        _ensure_settings(db, email)
        row = db.execute(
            text("""
                WITH account AS (
                    SELECT a.email, a.name
                    FROM public.auth_users AS a
                    WHERE lower(a.email) = :email AND a.is_active = true
                    UNION ALL
                    SELECT u.email, u.full_name AS name
                    FROM public.users AS u
                    WHERE lower(u.email) = :email AND u.is_deleted = false
                      AND NOT EXISTS (
                          SELECT 1 FROM public.auth_users AS a
                          WHERE lower(a.email) = :email
                      )
                    LIMIT 1
                )
                UPDATE public.user_settings AS s
                SET invitation_notifications = :invitation_notifications,
                    updated_at = CURRENT_TIMESTAMP
                FROM account AS a
                WHERE lower(s.email) = lower(a.email)
                RETURNING a.email, a.name, s.position, s.timezone,
                          s.invitation_notifications
            """),
            {
                "email": email.strip().lower(),
                "invitation_notifications": request.invitation_notifications,
            },
        ).mappings().first()
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        db.commit()
        return row
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to save preferences.") from exc


@router.delete(
    "/account",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_my_account(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        owner_still_has_membership = db.execute(
            text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM public.organization_memberships AS m
                    WHERE lower(m.email) = :email AND m.status = 'active'
                      AND (
                          m.role = 'owner'
                          OR EXISTS (
                              SELECT 1 FROM public.auth_users AS a
                              WHERE lower(a.email) = :email AND lower(a.role) = 'owner'
                          )
                          OR EXISTS (
                              SELECT 1 FROM public.users AS u
                              WHERE lower(u.email) = :email AND lower(u.role) = 'owner'
                          )
                      )
                )
            """),
            {"email": email},
        ).scalar_one()
        if owner_still_has_membership:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Owner accounts must transfer ownership and leave every organization before deletion.",
            )

        auth_result = db.execute(
            text("""
                UPDATE public.auth_users
                SET is_active = false, is_deleted = true,
                    deleted_at = CURRENT_TIMESTAMP
                WHERE lower(email) = :email AND is_deleted = false
            """),
            {"email": email},
        )
        user_result = db.execute(
            text("""
                UPDATE public.users
                SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
                WHERE lower(email) = :email AND is_deleted = false
            """),
            {"email": email},
        )
        if not auth_result.rowcount and not user_result.rowcount:
            db.rollback()
            raise HTTPException(status_code=404, detail="Active account not found.")

        db.execute(
            text("""
                UPDATE public.organization_memberships
                SET status = 'account_deleted'
                WHERE lower(email) = :email AND status = 'active'
            """),
            {"email": email},
        )
        db.execute(
            text("""
                UPDATE public.organization_invitations
                SET status = 'revoked', responded_at = CURRENT_TIMESTAMP
                WHERE lower(email) = :email AND status = 'pending'
            """),
            {"email": email},
        )
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503, detail="Unable to delete this account right now."
        ) from exc
