from typing import NoReturn

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import purchase_order_repository as repository


class PurchaseOrderNotFoundError(Exception):
    """Raised when a purchase order does not exist."""


class PurchaseOrderConflictError(Exception):
    """Raised when a purchase order action conflicts with the order state."""


class PurchaseOrderOperationError(Exception):
    """Raised when a purchase order database operation fails."""


def _raise_database_error(exc: SQLAlchemyError, message: str) -> NoReturn:
    original = getattr(exc, "orig", None)
    state = getattr(original, "sqlstate", None) or getattr(
        original, "pgcode", None
    )
    if state == "P0002":
        raise PurchaseOrderNotFoundError(
            "Purchase order or product was not found."
        ) from exc
    if state == "22023":
        detail = getattr(getattr(original, "diag", None), "message_primary", None)
        raise PurchaseOrderConflictError(detail or message) from exc
    if state == "42501":
        raise PurchaseOrderConflictError(
            "You are not allowed to perform this purchase order action."
        ) from exc
    raise PurchaseOrderOperationError(message) from exc


def _group_orders(rows: list[dict]) -> list[dict]:
    orders_by_id: dict[int, dict] = {}
    for row in rows:
        order_id = int(row["order_id"])
        order = orders_by_id.setdefault(
            order_id,
            {
                "order_id": order_id,
                "order_number": int(row["order_number"]),
                "notes": row["notes"],
                "created_by_email": row["created_by_email"],
                "created_at": row["created_at"],
                "status": row["status"],
                "items": [],
            },
        )
        ordered = int(row["quantity_ordered"])
        received = int(row["quantity_received"])
        order["items"].append(
            {
                "item_id": int(row["item_id"]),
                "product_id": int(row["product_id"]),
                "product_name": row["product_name"],
                "sku": row["sku"],
                "quantity_ordered": ordered,
                "unit_price": row["unit_price"],
                "quantity_received": received,
                "quantity_remaining": ordered - received,
            }
        )
    return list(orders_by_id.values())


def get_purchase_orders(
    db: Session, organization_id: int, limit: int = 100
) -> list[dict]:
    try:
        return _group_orders(
            repository.get_purchase_orders(db, organization_id, limit=limit)
        )
    except SQLAlchemyError as exc:
        raise PurchaseOrderOperationError(
            "Unable to retrieve purchase orders."
        ) from exc


def get_purchase_order_history(
    db: Session, organization_id: int, limit: int = 200
) -> list[dict]:
    try:
        return repository.get_purchase_order_history(
            db, organization_id, limit=limit
        )
    except SQLAlchemyError as exc:
        raise PurchaseOrderOperationError(
            "Unable to retrieve purchase order history."
        ) from exc


def delete_purchase_order(
    db: Session, organization_id: int, email: str, order_id: int
) -> None:
    try:
        repository.delete_purchase_order(db, organization_id, email, order_id)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc, "Unable to delete the purchase order.")


def create_purchase_order(
    db: Session,
    organization_id: int,
    email: str,
    notes: str | None,
    items: list[dict],
) -> dict:
    try:
        order_id = repository.create_purchase_order(
            db, organization_id, email, notes, items
        )
        orders = repository.get_purchase_orders(
            db, organization_id, order_id=order_id, limit=1
        )
        grouped = _group_orders(orders)
        if not grouped:
            raise PurchaseOrderOperationError(
                "The purchase order was created but could not be retrieved."
            )
        db.commit()
        return grouped[0]
    except PurchaseOrderOperationError:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        raise PurchaseOrderConflictError(
            "The purchase order references invalid or duplicate products."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc, "Unable to create the purchase order.")


def update_purchase_order(
    db: Session,
    organization_id: int,
    email: str,
    order_id: int,
    notes: str | None,
    items: list[dict],
) -> dict:
    try:
        repository.update_purchase_order(
            db, organization_id, email, order_id, notes, items
        )
        orders = repository.get_purchase_orders(
            db, organization_id, order_id=order_id, limit=1
        )
        grouped = _group_orders(orders)
        if not grouped:
            raise PurchaseOrderNotFoundError("Purchase order was not found.")
        db.commit()
        return grouped[0]
    except PurchaseOrderNotFoundError:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        raise PurchaseOrderConflictError(
            "The purchase order references invalid or duplicate products."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc, "Unable to update the purchase order.")


def receive_purchase_order_item(
    db: Session,
    organization_id: int,
    email: str,
    order_id: int,
    item_id: int,
    quantity: int,
) -> dict:
    try:
        repository.receive_purchase_order_item(
            db, organization_id, email, order_id, item_id, quantity
        )
        orders = repository.get_purchase_orders(
            db, organization_id, order_id=order_id, limit=1
        )
        grouped = _group_orders(orders)
        if not grouped:
            raise PurchaseOrderNotFoundError("Purchase order was not found.")
        db.commit()
        return grouped[0]
    except PurchaseOrderNotFoundError:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise PurchaseOrderConflictError(str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise PurchaseOrderConflictError(
            "The receipt conflicts with existing inventory data."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_database_error(exc, "Unable to receive the purchase order item.")
