from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import OrganizationContext, require_organization_membership
from app.db import report_repository, settings_repository
from app.db.session import get_db
from app.schemas.reports import (
    DashboardStockFlow,
    InventoryReport,
    UsageAnalyticsSummary,
)
from app.schemas.settings import UsageAnalyticsPageView

router = APIRouter()


@router.post("/usage-analytics/page-view", status_code=status.HTTP_204_NO_CONTENT)
def record_usage_page_view(
    request: UsageAnalyticsPageView,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        report_repository.record_usage_page_view(
            db, context.organization_id, context.email, request.page
        )
        db.commit()
        return None
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to record anonymous usage data.",
        ) from exc


@router.get("/usage-analytics", response_model=UsageAnalyticsSummary)
def get_usage_analytics(
    days: int = Query(default=30, ge=7, le=90),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if context.role == "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usage analytics are available to Owners and Managers.",
        )
    try:
        return report_repository.get_usage_analytics_summary(
            db, context.organization_id, days
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load usage analytics.",
        ) from exc


@router.get("/dashboard-stock-flow", response_model=DashboardStockFlow)
def dashboard_stock_flow(
    days: int = Query(default=7),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if days not in (7, 14, 30):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="days must be 7, 14 or 30.",
        )
    try:
        return report_repository.get_dashboard_stock_flow(
            db,
            context.organization_id,
            days,
            settings_repository.get_user_timezone(db, context.email),
        )
    except (SQLAlchemyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load daily stock flow.",
        ) from exc


@router.get("/inventory", response_model=InventoryReport)
def inventory_report(
    days: int = Query(default=365),
    offset: int = Query(default=0, ge=0, le=100),
    year_offset: int = Query(default=0, ge=0, le=3),
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
            detail="Reports are available to Owners and Managers.",
        )
    try:
        return report_repository.get_inventory_report(
            db,
            context.organization_id,
            days,
            settings_repository.get_user_timezone(db, context.email),
            offset,
            year_offset,
        )
    except (SQLAlchemyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load inventory reports.",
        ) from exc
