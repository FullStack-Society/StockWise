from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import (
    OrganizationContext,
    require_organization_membership,
)
from app.db.session import get_db
from app.db.sales_repository import (
    SaleProductNotFoundError,
    create_sale,
    get_existing_sale_items_sold,
)
from app.schemas.sales import SaleCreate, SaleResponse

router = APIRouter()


@router.post(
    "/",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
)
def checkout_sale(
    request: SaleCreate,
    context: OrganizationContext = Depends(require_organization_membership),
    db: Session = Depends(get_db),
):
    quantities: dict[int, int] = {}
    for item in request.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity
    if any(quantity > 2_147_483_647 for quantity in quantities.values()):
        raise HTTPException(status_code=422, detail="Sale quantity is too large.")
    try:
        count = create_sale(
            db,
            context.organization_id,
            context.email,
            str(request.sale_id),
            request.payment_method,
            [
                {"product_id": product_id, "quantity": quantity}
                for product_id, quantity in quantities.items()
            ],
        )
        return {"sale_id": request.sale_id, "items_sold": count}
    except SaleProductNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        try:
            existing_result = get_existing_sale_items_sold(
                db, context.organization_id, str(request.sale_id)
            )
        except SQLAlchemyError as lookup_exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to complete this sale. No stock was changed.",
            ) from lookup_exc
        if existing_result is not None:
            return {
                "sale_id": request.sale_id,
                "items_sold": existing_result,
            }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more products are no longer available in the requested quantity.",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        original = getattr(exc, "orig", None)
        state = getattr(original, "sqlstate", None) or getattr(
            original, "pgcode", None
        )
        if state == "P0002":
            raise HTTPException(
                status_code=404,
                detail="A product in this sale no longer exists.",
            ) from exc
        if state == "22023":
            detail = getattr(getattr(original, "diag", None), "message_primary", None)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=detail or "Stock changed before checkout. Review the cart and try again.",
            ) from exc
        if state == "42501":
            raise HTTPException(
                status_code=403,
                detail="You are not allowed to record this sale.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to complete this sale. No stock was changed.",
        ) from exc
