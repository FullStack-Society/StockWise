from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import require_internal_api_key, require_signed_actor
from app.db import settings_repository as repository
from app.db.session import get_db
from app.services.auth_service import hash_password, verify_password
from app.schemas.settings import (
    PasswordUpdate,
    PreferencesUpdate,
    ProfileSettings,
    ProfileSettingsUpdate,
)

router = APIRouter(dependencies=[Depends(require_internal_api_key)])


@router.get("/", response_model=ProfileSettings)
def get_settings(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        row = repository.get_settings(db, email)
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        db.commit()
        return row
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503, detail="Unable to load account settings."
        ) from exc


@router.put("/profile", response_model=ProfileSettings)
def update_profile(
    request: ProfileSettingsUpdate,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Enter your name.")

    try:
        row = repository.update_profile(db, email, name, request.timezone.strip())
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        db.commit()
        return row
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503, detail="Unable to save profile settings."
        ) from exc


@router.put("/preferences", response_model=ProfileSettings)
def update_preferences(
    request: PreferencesUpdate,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        row = repository.update_preferences(db, email, request.model_dump())
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        db.commit()
        return row
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503, detail="Unable to save preferences."
        ) from exc


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(
    request: PasswordUpdate,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        account = repository.get_password_account(db, email)
        if account is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        if not verify_password(request.current_password, account["password_hash"]):
            db.rollback()
            raise HTTPException(
                status_code=400, detail="Current password is incorrect."
            )
        if request.current_password == request.new_password:
            db.rollback()
            raise HTTPException(
                status_code=422,
                detail="Choose a new password different from your current password.",
            )

        updated = repository.update_password(
            db,
            email,
            account["account_table"],
            hash_password(request.new_password),
        )
        if not updated:
            db.rollback()
            raise HTTPException(status_code=404, detail="Account not found.")
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503, detail="Unable to update your password."
        ) from exc


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        result = repository.delete_account(db, email)
        if result["owner_membership"]:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Owner accounts must transfer ownership and leave every "
                    "organization before deletion."
                ),
            )
        if not result["account_found"]:
            db.rollback()
            raise HTTPException(status_code=404, detail="Active account not found.")
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503, detail="Unable to delete this account right now."
        ) from exc
