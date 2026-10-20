from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine

router = APIRouter()


@router.get("/")
def health_check():
    return {
        "success": True,
        "message": "StockWise API is running.",
    }


@router.get("/db")
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "success": True,
            "message": "PostgreSQL connection successful.",
        }
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to PostgreSQL.",
        ) from exc