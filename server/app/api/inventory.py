from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import (
    OrganizationContext,
    require_organization_membership,
)
from app.db.session import get_db
from app.schemas.inventory import (
    CategoryResponse,
    InventoryCategoryCreate,
    InventoryCreate,
    InventoryMovementResponse,
    InventoryResponse,
    StockAdjustment,
    StocktakeCreate,
    InventoryUpdate,
)
from app.services import inventory_service as service

router = APIRouter()


def handle_service_error(exc: Exception) -> HTTPException:
    """Convert service exceptions into appropriate HTTP responses."""

    if isinstance(exc, service.InventoryNotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    if isinstance(exc, service.InventoryConflictError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    if isinstance(exc, service.InventoryOperationError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred.",
    )


@router.get(
    "/movements",
    response_model=list[InventoryMovementResponse],
)
def get_inventory_history(
    product_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=100, ge=1, le=200),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.get_inventory_history(
            db, context.organization_id, product_id, limit
        )
    except service.InventoryOperationError as exc:
        raise handle_service_error(exc) from exc


@router.get("/", response_model=list[InventoryResponse])
def get_inventory(
    search: str | None = Query(default=None),
    category_id: int | None = Query(default=None, gt=0),
    stock_status: Literal[
        "In stock",
        "Low stock",
        "Critical",
    ] | None = Query(default=None),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Retrieve inventory with optional filters."""

    try:
        return service.get_inventory_list(
            db=db,
            organization_id=context.organization_id,
            search=search,
            category_id=category_id,
            stock_status=stock_status,
        )
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.get("/alerts", response_model=list[InventoryResponse])
def get_stock_alerts(
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Return only products that have crossed the low or critical stock level."""
    try:
        alerts: list[dict] = []
        for stock_status in ("Low stock", "Critical"):
            alerts.extend(
                service.get_inventory_list(
                    db=db,
                    organization_id=context.organization_id,
                    stock_status=stock_status,
                )
            )
        return alerts
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.get(
    "/categories/",
    response_model=list[CategoryResponse],
)
def get_categories(
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Retrieve categories."""

    try:
        return service.get_categories(db=db, organization_id=context.organization_id)
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.post(
    "/categories/",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    request: InventoryCategoryCreate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if context.role.lower() not in {"owner", "manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can manage inventory categories.",
        )
    try:
        return service.create_category(
            db, context.organization_id, request.category_name
        )
    except (
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category(
    category_id: int,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if context.role.lower() not in {"owner", "manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can manage inventory categories.",
        )
    try:
        service.delete_category(db, context.organization_id, category_id)
    except (
        service.InventoryNotFoundError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc
    return None


@router.get(
    "/{product_id}",
    response_model=InventoryResponse,
)
def get_inventory_item(
    product_id: int,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Retrieve one inventory item."""

    try:
        return service.get_inventory_by_id(
            db=db,
            organization_id=context.organization_id,
            product_id=product_id,
        )
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.post(
    "/",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_item(
    product: InventoryCreate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Create a new inventory item."""

    try:
        return service.create_inventory(
            db=db,
            organization_id=context.organization_id,
            product_data=product.model_dump(),
            actor_email=context.email,
        )
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.put(
    "/{product_id}",
    response_model=InventoryResponse,
)
def update_inventory_item(
    product_id: int,
    product: InventoryUpdate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Update an existing inventory item."""

    try:
        return service.update_inventory(
            db=db,
            organization_id=context.organization_id,
            product_id=product_id,
            product_data=product.model_dump(exclude_unset=True),
            supplied_fields=product.model_fields_set,
        )
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_inventory_item(
    product_id: int,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Delete an inventory item."""

    try:
        service.delete_inventory(
            db=db,
            organization_id=context.organization_id,
            product_id=product_id,
        )
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc

    return None


@router.post("/{product_id}/movements", status_code=status.HTTP_200_OK)
def adjust_inventory_stock(
    product_id: int,
    request: StockAdjustment,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if (
        request.quantity == 0
        or (
            request.transaction_type != "ADJUST"
            and request.quantity < 0
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a non-zero adjustment or a positive movement quantity.",
        )
    try:
        quantity = service.adjust_inventory_stock(
            db=db,
            organization_id=context.organization_id,
            email=context.email,
            product_id=product_id,
            transaction_type=request.transaction_type,
            quantity=request.quantity,
            remarks=request.remarks.strip(),
        )
        return {"quantity": quantity}
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.post("/{product_id}/stocktake", status_code=status.HTTP_200_OK)
def record_inventory_stocktake(
    product_id: int,
    request: StocktakeCreate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        quantity = service.record_stocktake(
            db=db,
            organization_id=context.organization_id,
            email=context.email,
            product_id=product_id,
            counted_quantity=request.counted_quantity,
            remarks=request.remarks.strip(),
        )
        return {"quantity": quantity}
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc
