from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.health import router as health_router

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="StockWise retail inventory management API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.client_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    health_router,
    prefix="/api/health",
    tags=["Health"],
)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "message": "Welcome to StockWise.",
        "docs": "/docs",
    }