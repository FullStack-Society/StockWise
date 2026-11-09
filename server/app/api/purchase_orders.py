from typing import Annotated
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import (
    OrganizationContext,
    require_organization_membership,
)
from app.db.session import get_db
from app.schemas.purchase_orders import (
    PurchaseOrderCreate,
    PurchaseOrderHistoryResponse,
    PurchaseOrderReceipt,
    PurchaseOrderResponse,
    PurchaseOrderUpdate,
)
from app.services import purchase_order_service as service

router = APIRouter()


def serialize_items(items):
    return [
        {
            "product_id": item.product_id,
            "quantity_ordered": item.quantity_ordered,
            # The database function validates unit_price as a JSON number.
            # Returning this as text makes jsonb_typeof(...) report "string".
            "unit_price": float(
                Decimal(item.unit_price).quantize(Decimal("0.01"))
            ),
        }
        for item in items
    ]


def handle_service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, service.PurchaseOrderNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, service.PurchaseOrderConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Unable to complete the purchase order request.",
    )


@router.get("/", response_model=list[PurchaseOrderResponse])
def get_purchase_orders(
    limit: int = Query(default=100, ge=1, le=200),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.get_purchase_orders(db, context.organization_id, limit)
    except service.PurchaseOrderOperationError as exc:
        raise handle_service_error(exc) from exc


@router.get("/history", response_model=list[PurchaseOrderHistoryResponse])
def get_purchase_order_history(
    limit: int = Query(default=500, ge=1, le=500),
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.get_purchase_order_history(
            db, context.organization_id, limit
        )
    except service.PurchaseOrderOperationError as exc:
        raise handle_service_error(exc) from exc


@router.post(
    "/",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_order(
    request: PurchaseOrderCreate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.create_purchase_order(
            db,
            context.organization_id,
            context.email,
            request.notes,
            serialize_items(request.items),
        )
    except (
        service.PurchaseOrderNotFoundError,
        service.PurchaseOrderConflictError,
        service.PurchaseOrderOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.put("/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    order_id: Annotated[int, Path(gt=0, le=2_147_483_647)],
    request: PurchaseOrderUpdate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.update_purchase_order(
            db,
            context.organization_id,
            context.email,
            order_id,
            request.notes,
            serialize_items(request.items),
        )
    except (
        service.PurchaseOrderNotFoundError,
        service.PurchaseOrderConflictError,
        service.PurchaseOrderOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(
    order_id: Annotated[int, Path(gt=0, le=2_147_483_647)],
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        service.delete_purchase_order(
            db, context.organization_id, context.email, order_id
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except (
        service.PurchaseOrderNotFoundError,
        service.PurchaseOrderConflictError,
        service.PurchaseOrderOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc


@router.post(
    "/{order_id}/items/{item_id}/receive",
    response_model=PurchaseOrderResponse,
)
def receive_purchase_order_item(
    order_id: Annotated[int, Path(gt=0, le=2_147_483_647)],
    item_id: Annotated[int, Path(gt=0, le=2_147_483_647)],
    request: PurchaseOrderReceipt,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    try:
        return service.receive_purchase_order_item(
            db,
            context.organization_id,
            context.email,
            order_id,
            item_id,
            request.quantity,
        )
    except (
        service.PurchaseOrderNotFoundError,
        service.PurchaseOrderConflictError,
        service.PurchaseOrderOperationError,
    ) as exc:
        raise handle_service_error(exc) from exc
