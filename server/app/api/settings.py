import logging

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
    UsageAnalyticsConsent,
    AccountSecurityStatus,
    InventoryDefaults,
    InventoryDefaultsUpdate,
    SecurityPrivacyPreferences,
    SecurityPrivacyPreferencesUpdate,
)
from app.schemas.auth import (
    TwoFactorCodeRequest,
    TwoFactorEnrollment,
    TwoFactorRecoveryCodes,
    TwoFactorStatus,
)
from app.services import two_factor_service
from app.services.two_factor_service import InvalidTwoFactorCodeError
from app.services.auth_service import AuthenticationSetupError

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_internal_api_key)])


@router.get("/security-privacy-preferences", response_model=SecurityPrivacyPreferences)
def get_security_privacy_preferences(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        result = repository.get_security_privacy_preferences(db, email)
        db.commit()
        return result
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to load security preferences.") from exc


@router.put("/security-privacy-preferences", response_model=SecurityPrivacyPreferences)
def update_security_privacy_preferences(
    request: SecurityPrivacyPreferencesUpdate,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        result = repository.update_security_privacy_preferences(
            db, email, request.model_dump()
        )
        db.commit()
        return result
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to save security preferences.") from exc


@router.get("/inventory-defaults", response_model=InventoryDefaults)
def get_inventory_defaults(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        result = repository.get_inventory_defaults(db, email)
        db.commit()
        return result
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to load inventory defaults.") from exc


@router.put("/inventory-defaults", response_model=InventoryDefaults)
def update_inventory_defaults(
    request: InventoryDefaultsUpdate,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        result = repository.update_inventory_defaults(
            db, email, request.default_reorder_point
        )
        db.commit()
        return result
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to save inventory defaults.") from exc


@router.get("/security-status", response_model=AccountSecurityStatus)
def get_account_security_status(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        return {
            "two_factor_enabled": two_factor_service.authenticator_enabled(db, email),
            "google_account_connected": repository.is_google_account_connected(db, email),
        }
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to load account security status.") from exc


@router.get("/usage-analytics-consent", response_model=UsageAnalyticsConsent)
def get_usage_analytics_consent(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        enabled = repository.get_usage_analytics_consent(db, email)
        db.commit()
        return {"enabled": enabled}
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to load analytics preference.") from exc


@router.put("/usage-analytics-consent", response_model=UsageAnalyticsConsent)
def update_usage_analytics_consent(
    request: UsageAnalyticsConsent,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        enabled = repository.update_usage_analytics_consent(db, email, request.enabled)
        db.commit()
        return {"enabled": enabled}
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to save analytics preference.") from exc


@router.get("/mfa", response_model=TwoFactorStatus)
def get_two_factor_status(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        return {"enabled": two_factor_service.authenticator_enabled(db, email)}
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to load security status.") from exc


@router.post("/mfa/enroll", response_model=TwoFactorEnrollment)
def begin_two_factor_enrollment(
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        return two_factor_service.begin_enrollment(db, email)
    except InvalidTwoFactorCodeError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Two-factor authentication is already enabled.") from exc
    except AuthenticationSetupError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to begin setup right now.") from exc


@router.post("/mfa/confirm", response_model=TwoFactorRecoveryCodes)
def confirm_two_factor_enrollment(
    request: TwoFactorCodeRequest,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        recovery_codes = two_factor_service.confirm_enrollment(db, email, request.code)
    except InvalidTwoFactorCodeError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="That code is invalid. Try the current code from your authenticator app.") from exc
    except AuthenticationSetupError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to enable two-factor authentication.") from exc
    return {"recovery_codes": recovery_codes}


@router.post("/mfa/disable", status_code=status.HTTP_204_NO_CONTENT)
def disable_two_factor(
    request: TwoFactorCodeRequest,
    email: str = Depends(require_signed_actor),
    db: Session = Depends(get_db),
):
    try:
        two_factor_service.disable_authenticator(db, email, request.code)
    except InvalidTwoFactorCodeError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Enter a valid authenticator code to disable two-factor authentication.") from exc
    except AuthenticationSetupError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to disable two-factor authentication.") from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
        logger.error(
            "Unable to save profile settings (database operation failed: %s)",
            type(exc).__name__,
        )
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
                    "Transfer ownership of or delete every organization you "
                    "own before deleting your account."
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
