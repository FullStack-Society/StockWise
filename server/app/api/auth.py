import hashlib
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import settings_repository
from app.db import auth_repository
from app.schemas.auth import (
    AuthenticatedUser,
    ForgotPasswordRequest,
    GoogleCredentialRequest,
    LoginRequest,
    LoginResponse,
    RegistrationPendingResponse,
    RegistrationRequest,
    RegistrationResendRequest,
    RegistrationVerifyRequest,
    ResetPasswordRequest,
    TwoFactorLoginRequest,
)
from app.services.auth_service import (
    AccountAlreadyExistsError,
    AuthenticationSetupError,
    InvalidRegistrationCodeError,
    InvalidCredentialsError,
    InvalidGoogleCredentialError,
    authenticate_google_user,
    authenticate_user,
    request_password_reset,
    reset_password,
    send_login_alert_email,
    send_password_reset_email,
)
from app.services import auth_service, two_factor_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _enforce_auth_rate_limit(
    db: Session, request: Request, scope: str, limit: int, window_seconds: int
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    subject_hash = hashlib.sha256(f"{scope}\0{client_ip}".encode("utf-8")).hexdigest()
    try:
        attempts, window_started_at = auth_repository.consume_auth_rate_limit(
            db, scope, subject_hash, limit, window_seconds
        )
        # Commit each attempt independently so failed credentials and rejected
        # requests still count, including when the app has multiple workers.
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Unable to record authentication rate limit.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is temporarily unavailable.",
        ) from exc
    if attempts > limit:
        expires_at = window_started_at.timestamp() + window_seconds
        retry_after = max(1, int(expires_at - datetime.now(timezone.utc).timestamp()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def _queue_login_alert_if_new_device(
    db: Session,
    email: str,
    device_id: str | None,
    background_tasks: BackgroundTasks,
) -> None:
    if not device_id:
        return
    try:
        if not settings_repository.login_alert_emails_enabled(db, email):
            return
        device_hash = hashlib.sha256(device_id.encode("utf-8")).hexdigest()
        is_new_device = settings_repository.register_login_device(
            db, email, device_hash
        )
        db.commit()
        if is_new_device:
            background_tasks.add_task(send_login_alert_email, email)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Unable to record device sign-in for login alerts.")


def _login_response(db: Session, user: dict) -> LoginResponse:
    if two_factor_service.authenticator_enabled(db, user["email"]):
        return LoginResponse(
            two_factor_required=True,
            challenge_token=two_factor_service.create_login_challenge(
                db, user["email"]
            ),
        )
    return LoginResponse(
        user=AuthenticatedUser(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
        )
    )


@router.post(
    "/register",
    response_model=RegistrationPendingResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def register(
    registration: RegistrationRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(db, http_request, "register", 5, 60 * 60)
    try:
        auth_service.request_registration_verification(
            db,
            name=registration.name,
            email=str(registration.email),
            password=registration.password,
        )
    except AccountAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Sign in instead.",
        ) from exc
    except AuthenticationSetupError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {"message": "Check your Gmail inbox for an 8-digit verification code."}


@router.post("/register/resend", response_model=RegistrationPendingResponse)
def resend_registration_code(
    request: RegistrationResendRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(db, http_request, "register-resend", 3, 15 * 60)
    try:
        auth_service.resend_registration_verification(db, str(request.email))
    except AuthenticationSetupError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return {"message": "If registration is pending, a new code has been sent."}


@router.post("/register/verify", response_model=LoginResponse)
def verify_registration_email(
    request: RegistrationVerifyRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(db, http_request, "register-verify", 20, 15 * 60)
    try:
        user = auth_service.verify_registration(
            db, str(request.email), request.code
        )
    except InvalidRegistrationCodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That code is invalid or expired. Request a new code and try again.",
        ) from exc
    except AccountAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Sign in instead.",
        ) from exc
    except AuthenticationSetupError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return _login_response(db, user)


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(db, http_request, "login", 20, 15 * 60)
    try:
        user = authenticate_user(
            db,
            email=str(credentials.email),
            password=credentials.password,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        ) from exc
    except AuthenticationSetupError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    response = _login_response(db, user)
    if response.user is not None:
        _queue_login_alert_if_new_device(
            db, user["email"], credentials.device_id, background_tasks
        )
    return response


@router.post("/verify-2fa", response_model=LoginResponse)
def verify_two_factor_login(
    request: TwoFactorLoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        user = two_factor_service.verify_login_challenge(
            db, request.challenge_token, request.code
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify the code right now.",
        ) from exc
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The code is invalid or the verification attempt expired.",
        )
    _queue_login_alert_if_new_device(
        db, user["email"], request.device_id, background_tasks
    )
    return LoginResponse(
        user=AuthenticatedUser(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
        )
    )


@router.post("/google", response_model=LoginResponse)
def google_login(
    request: GoogleCredentialRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(db, http_request, "google-login", 20, 15 * 60)
    try:
        user = authenticate_google_user(db, request.credential, request.nonce)
        settings_repository.mark_google_account_connected(db, user["email"])
        db.commit()
    except InvalidGoogleCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google sign-in could not be verified.",
        ) from exc
    except AuthenticationSetupError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to sign in with Google right now.",
        ) from exc

    response = _login_response(db, user)
    if response.user is not None:
        _queue_login_alert_if_new_device(
            db, user["email"], request.device_id, background_tasks
        )
    return response


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(db, http_request, "forgot-password", 5, 15 * 60)
    try:
        reset = request_password_reset(db, str(request.email))
        if reset:
            background_tasks.add_task(send_password_reset_email, *reset)
    except AuthenticationSetupError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset email is not configured.",
        ) from exc
    return {"message": "If the account exists, a reset link will be emailed."}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password_route(
    request: ResetPasswordRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(db, http_request, "reset-password", 10, 15 * 60)
    try:
        updated = reset_password(db, request.token, request.new_password)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reset your password right now.",
        ) from exc
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or expired. Request a new one.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
