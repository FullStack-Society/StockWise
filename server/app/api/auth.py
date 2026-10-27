from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.auth_models import AuthUser
from app.db.session import get_db
from app.schemas.auth import AuthenticatedUser, LoginRequest, LoginResponse, RegistrationRequest
from app.services.auth_service import (
    AuthenticationSetupError,
    InvalidCredentialsError,
    authenticate_user,
    register_account,
    AccountAlreadyExistsError,
)

router = APIRouter()


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

    return LoginResponse(
        user=AuthenticatedUser(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
        )
    )


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
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

    if isinstance(user, AuthUser):
        user_id = user.id
        full_name = user.name
    else:
        user_id = user.user_id
        full_name = user.full_name

    return LoginResponse(
        user=AuthenticatedUser(
            id=user_id,
            name=full_name,
            email=user.email,
            role=user.role,
        )
    )
