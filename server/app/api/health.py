from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def health_check():
    """Return a basic liveness response for the API."""
    return {"status": "ok"}
