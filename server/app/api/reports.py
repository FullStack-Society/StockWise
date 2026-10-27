from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import OrganizationContext, require_organization_membership
from app.db import report_repository
from app.db.session import get_db
from app.schemas.reports import InventoryReport

router = APIRouter()


@router.get("/inventory", response_model=InventoryReport)
def inventory_report(
    days: int = Query(default=365),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if days not in (30, 90, 365):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="days must be 30, 90 or 365.",
        )
    if context.role == "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reports are available to Owners and Admins.",
        )
    try:
        return report_repository.get_inventory_report(
            db, context.organization_id, days
        )
    except (SQLAlchemyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load inventory reports.",
        ) from exc
