from typing import NoReturn

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import inventory_repository as repository


class InventoryNotFoundError(Exception):
    """Raised when an inventory item does not exist."""


class InventoryConflictError(Exception):
    """Raised when an inventory operation conflicts with existing data."""


class InventoryOperationError(Exception):
    """Raised when a database operation fails."""


def _raise_stock_error(exc: SQLAlchemyError, message: str) -> NoReturn:
    original = getattr(exc, "orig", None)
    state = getattr(original, "sqlstate", None) or getattr(
        original, "pgcode", None
    )
    if state == "P0002":
        raise InventoryNotFoundError(
            "Product was not found."
        ) from exc
    if state == "22023":
        detail = getattr(getattr(original, "diag", None), "message_primary", None)
        raise InventoryConflictError(detail or message) from exc
    if state == "42501":
        raise InventoryConflictError(
            "You are not allowed to perform this inventory action."
        ) from exc
    raise InventoryOperationError(message) from exc


def get_inventory_list(
    db: Session,
    organization_id: int,
    search: str | None = None,
    category_id: int | None = None,
    stock_status: str | None = None,
) -> list[dict]:
    try:
        return repository.get_inventory_list(
            db=db,
            organization_id=organization_id,
            search=search,
            category_id=category_id,
            stock_status=stock_status,
        )
    except SQLAlchemyError as exc:
        raise InventoryOperationError(
            "Unable to retrieve inventory."
        ) from exc


def get_inventory_by_id(
    db: Session,
    organization_id: int,
    product_id: int,
) -> dict:
    try:
        product = repository.get_inventory_by_id(
            db=db,
            organization_id=organization_id,
            product_id=product_id,
        )

        if product is None:
            raise InventoryNotFoundError(
                f"Inventory item {product_id} was not found."
            )

        return product

    except InventoryNotFoundError:
        raise
    except SQLAlchemyError as exc:
        raise InventoryOperationError(
            "Unable to retrieve the inventory item."
        ) from exc


def get_categories(db: Session, organization_id: int) -> list[dict]:
    try:
        return repository.get_categories(db, organization_id)
    except SQLAlchemyError as exc:
        raise InventoryOperationError(
            "Unable to retrieve categories."
        ) from exc


def create_category(
    db: Session, organization_id: int, category_name: str
) -> dict:
    try:
        category = repository.create_category(
            db, organization_id, category_name.strip()
        )
        db.commit()
        return category
    except IntegrityError as exc:
        db.rollback()
        raise InventoryConflictError(
            "A category with this name already exists."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise InventoryOperationError("Unable to create the category.") from exc


def delete_category(
    db: Session, organization_id: int, category_id: int
) -> None:
    try:
        deleted = repository.delete_category(
            db, organization_id, category_id
        )
        if not deleted:
            db.rollback()
            raise InventoryNotFoundError("Category was not found.")
        db.commit()
    except InventoryNotFoundError:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise InventoryOperationError("Unable to delete the category.") from exc


def create_inventory(
    db: Session,
    organization_id: int,
    product_data: dict,
    actor_email: str,
) -> dict:
    try:
        product = repository.create_inventory(
            db=db,
            organization_id=organization_id,
            actor_email=actor_email,
            **product_data,
        )

        db.commit()
        return product

    except IntegrityError as exc:
        db.rollback()
        constraint = getattr(getattr(getattr(exc, "orig", None), "diag", None), "constraint_name", None)
        if constraint == "products_organization_upc_unique_idx":
            raise InventoryConflictError(
                "A product with this UPC already exists in the organization."
            ) from exc
        raise InventoryConflictError(
            "The product could not be created. Check whether its SKU already "
            "exists, and verify its category."
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise InventoryOperationError(
            "Unable to create the inventory item."
        ) from exc


def update_inventory(
    db: Session,
    organization_id: int,
    product_id: int,
    product_data: dict,
    supplied_fields: set[str] | None = None,
) -> dict:
    try:
        product = repository.update_inventory(
            db=db,
            organization_id=organization_id,
            product_id=product_id,
            supplied_fields=supplied_fields,
            **product_data,
        )

        if product is None:
            db.rollback()
            raise InventoryNotFoundError(
                f"Inventory item {product_id} was not found."
            )

        db.commit()
        return product

    except InventoryNotFoundError:
        raise
    except IntegrityError as exc:
        db.rollback()
        constraint = getattr(getattr(getattr(exc, "orig", None), "diag", None), "constraint_name", None)
        if constraint == "products_organization_upc_unique_idx":
            raise InventoryConflictError(
                "A product with this UPC already exists in the organization."
            ) from exc
        raise InventoryConflictError(
            "The update conflicts with existing data. Check the SKU "
            "and category."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise InventoryOperationError(
            "Unable to update the inventory item."
        ) from exc


def delete_inventory(
    db: Session,
    organization_id: int,
    product_id: int,
) -> None:
    try:
        deleted = repository.delete_inventory(
            db=db,
            organization_id=organization_id,
            product_id=product_id,
        )

        if not deleted:
            db.rollback()
            raise InventoryNotFoundError(
                f"Inventory item {product_id} was not found or is already deleted."
            )

        db.commit()

    except InventoryOperationError:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        original = getattr(exc, "orig", None)
        state = getattr(original, "sqlstate", None) or getattr(
            original, "pgcode", None
        )
        if (
            state == "22023"
            and getattr(
                getattr(original, "diag", None), "message_primary", None
            )
            == "This product cannot be deleted while a purchase order has quantity remaining"
        ):
            raise InventoryConflictError(
                "This product cannot be deleted while a purchase order has quantity remaining."
            ) from exc
        raise InventoryOperationError(
            "Unable to delete the inventory item."
        ) from exc


def adjust_inventory_stock(
    db: Session,
    organization_id: int,
    email: str,
    product_id: int,
    transaction_type: str,
    quantity: int,
    remarks: str,
) -> int:
    try:
        quantity_after = repository.adjust_inventory_stock(
            db=db,
            organization_id=organization_id,
            email=email,
            product_id=product_id,
            transaction_type=transaction_type,
            quantity=quantity,
            remarks=remarks,
        )

        db.commit()
        return quantity_after

    except IntegrityError as exc:
        db.rollback()
        raise InventoryConflictError(
            "The stock adjustment references invalid data."
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        _raise_stock_error(exc, "Unable to record the stock movement.")


def record_stocktake(
    db: Session,
    organization_id: int,
    email: str,
    product_id: int,
    counted_quantity: int,
    remarks: str,
) -> int:
    try:
        quantity_after = repository.record_stocktake(
            db=db,
            organization_id=organization_id,
            email=email,
            product_id=product_id,
            counted_quantity=counted_quantity,
            remarks=remarks,
        )
        db.commit()
        return quantity_after
    except IntegrityError as exc:
        db.rollback()
        raise InventoryConflictError(
            "The stocktake conflicts with existing inventory data."
        ) from exc
    except ValueError as exc:
        db.rollback()
        raise InventoryConflictError(
            "The stocktake conflicts with existing inventory data."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        _raise_stock_error(exc, "Unable to record the stocktake.")


def get_inventory_history(
    db: Session,
    organization_id: int,
    product_id: int | None,
    limit: int,
) -> list[dict]:
    try:
        return repository.get_inventory_history(
            db, organization_id, product_id, limit
        )
    except SQLAlchemyError as exc:
        raise InventoryOperationError(
            "Unable to retrieve inventory history."
        ) from exc
