import hashlib
import logging
import threading
import time
from collections import defaultdict, deque
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import settings_repository
from app.schemas.auth import (
    AuthenticatedUser,
    ForgotPasswordRequest,
    GoogleCredentialRequest,
    LoginRequest,
    LoginResponse,
    RegistrationRequest,
    ResetPasswordRequest,
    TwoFactorLoginRequest,
)
from app.services.auth_service import (
    AccountAlreadyExistsError,
    AuthenticationSetupError,
    InvalidCredentialsError,
    InvalidGoogleCredentialError,
    authenticate_google_user,
    authenticate_user,
    request_password_reset,
    register_account,
    reset_password,
    send_login_alert_email,
    send_password_reset_email,
)
from app.services import two_factor_service

router = APIRouter()
logger = logging.getLogger(__name__)
_RESET_LIMIT = 5
_RESET_WINDOW_SECONDS = 15 * 60
_reset_requests: dict[str, deque[float]] = defaultdict(deque)
_reset_requests_lock = threading.Lock()


def _allow_password_reset_request(client_key: str) -> bool:
    now = time.monotonic()
    with _reset_requests_lock:
        requests = _reset_requests[client_key]
        while requests and now - requests[0] >= _RESET_WINDOW_SECONDS:
            requests.popleft()
        if len(requests) >= _RESET_LIMIT:
            return False
        requests.append(now)
        return True


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


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(
    registration: RegistrationRequest,
    db: Session = Depends(get_db),
):
    try:
        user = register_account(
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

    return _login_response(db, user)


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
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
    db: Session = Depends(get_db),
):
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
    client_key = http_request.client.host if http_request.client else "unknown"
    if not _allow_password_reset_request(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reset requests. Try again later.",
        )
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
    db: Session = Depends(get_db),
):
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
