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
    InventoryLocationCreate,
    InventoryLocationResponse,
    InventoryMovementResponse,
    InventoryResponse,
    StockAdjustment,
    StockTransfer,
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


def current_location_id(
    db: Session,
    organization_id: int,
    location_id: int | None,
) -> int:
    locations = service.get_inventory_locations(db, organization_id)
    if not locations:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No inventory location is available for this organization.",
        )
    selected_id = location_id or int(locations[0]["location_id"])
    if not any(int(location["location_id"]) == selected_id for location in locations):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory location was not found.",
        )
    return selected_id


@router.get(
    "/locations",
    response_model=list[InventoryLocationResponse],
)
def get_inventory_locations(
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.get_inventory_locations(db, context.organization_id)
    except service.InventoryOperationError as exc:
        raise handle_service_error(exc) from exc


@router.post(
    "/locations",
    response_model=InventoryLocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_location(
    request: InventoryLocationCreate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    if context.role.lower() not in {"owner", "manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can add inventory locations.",
        )
    try:
        return service.create_inventory_location(
            db, context.organization_id, request.location_name
        )
    except (
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.get(
    "/movements",
    response_model=list[InventoryMovementResponse],
)
def get_inventory_history(
    location_id: int = Query(gt=0),
    product_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=100, ge=1, le=200),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        selected_location = current_location_id(
            db, context.organization_id, location_id
        )
        return service.get_inventory_history(
            db, context.organization_id, selected_location, product_id, limit
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
    location_id: int | None = Query(default=None, gt=0),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Retrieve inventory with optional filters."""

    try:
        selected_location = current_location_id(
            db, context.organization_id, location_id
        )
        return service.get_inventory_list(
            db=db,
            organization_id=context.organization_id,
            location_id=selected_location,
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
    location_id: int | None = Query(default=None, gt=0),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    """Retrieve one inventory item."""

    try:
        return service.get_inventory_by_id(
            db=db,
            organization_id=context.organization_id,
            product_id=product_id,
            location_id=current_location_id(
                db, context.organization_id, location_id
            ),
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
        selected_location = current_location_id(
            db, context.organization_id, product.location_id
        )
        return service.create_inventory(
            db=db,
            organization_id=context.organization_id,
            product_data=product.model_dump(exclude={"location_id"}),
            location_id=selected_location,
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
        selected_location = current_location_id(
            db, context.organization_id, product.location_id
        )
        return service.update_inventory(
            db=db,
            organization_id=context.organization_id,
            product_id=product_id,
            product_data=product.model_dump(exclude={"location_id"}),
            location_id=selected_location,
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


@router.post("/{product_id}/transfers")
def transfer_inventory_stock(
    product_id: int,
    request: StockTransfer,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.transfer_inventory_stock(
            db=db,
            organization_id=context.organization_id,
            email=context.email,
            source_location_id=request.source_location_id,
            destination_location_id=request.destination_location_id,
            product_id=product_id,
            quantity=request.quantity,
            remarks=request.remarks.strip(),
        )
    except (
        service.InventoryNotFoundError,
        service.InventoryConflictError,
        service.InventoryOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


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
            location_id=request.location_id,
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
            location_id=request.location_id,
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
