from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.inventory import router as inventory_router
from app.api.organizations import router as organizations_router
from app.api.reports import router as reports_router
from app.api.settings import router as settings_router
from app.db.session import SessionLocal
from app.services.auth_service import seed_owner


@asynccontextmanager
async def lifespan(_: FastAPI):
    with SessionLocal() as db:
        seed_owner(
            db,
            name=settings.owner_name,
            email=settings.owner_email,
            password=settings.owner_password,
        )
    yield

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="StockWise retail inventory management API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.client_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"],
)

app.include_router(
    health_router,
    prefix="/api/health",
    tags=["Health"],
)

app.include_router(
    inventory_router,
    prefix="/api/inventory",
    tags=["Inventory"],
)

app.include_router(
    organizations_router,
    prefix="/api/organizations",
    tags=["Organizations"],
)

app.include_router(
    settings_router,
    prefix="/api/settings",
    tags=["Account Settings"],
)

app.include_router(
    reports_router,
    prefix="/api/reports",
    tags=["Reports"],
)

@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "message": "Welcome to StockWise.",
        "docs": "/docs",
    }
