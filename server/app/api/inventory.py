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
    InventoryCreate,
    InventoryResponse,
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred.",
    )


@router.get("/", response_model=list[InventoryResponse])
def get_inventory(
    search: str | None = Query(default=None),
    category_id: int | None = Query(default=None, gt=0),
    stock_status: Literal[
        "In stock",
        "Low stock",
        "Out of stock",
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
            product_data=product.model_dump(),
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

