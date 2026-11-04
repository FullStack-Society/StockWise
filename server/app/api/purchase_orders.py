from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.core.security import (
    OrganizationContext,
    require_organization_membership,
)
from app.db.session import get_db
from app.schemas.purchase_orders import (
    PurchaseOrderCreate,
    PurchaseOrderReceipt,
    PurchaseOrderResponse,
)
from app.services import purchase_order_service as service

router = APIRouter()


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
            [item.model_dump() for item in request.items],
        )
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
