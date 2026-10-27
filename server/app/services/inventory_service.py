from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import inventory_repository as repository


class InventoryNotFoundError(Exception):
    """Raised when an inventory item does not exist."""


class InventoryConflictError(Exception):
    """Raised when an inventory operation conflicts with existing data."""


class InventoryOperationError(Exception):
    """Raised when a database operation fails."""


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
        repository.ensure_default_categories(db, organization_id)
        return repository.get_categories(db, organization_id)
    except SQLAlchemyError as exc:
        raise InventoryOperationError(
            "Unable to retrieve categories."
        ) from exc


def create_inventory(
    db: Session,
    organization_id: int,
    product_data: dict,
) -> dict:
    try:
        product = repository.create_inventory(
            db=db,
            organization_id=organization_id,
            **product_data,
        )

        db.commit()
        return product

    except IntegrityError as exc:
        db.rollback()
        raise InventoryConflictError(
            "The product could not be created. Check whether its SKU "
            "or another unique value already exists, and verify its category."
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
) -> dict:
    try:
        product = repository.update_inventory(
            db=db,
            organization_id=organization_id,
            product_id=product_id,
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
        raise InventoryOperationError(
            "Unable to delete the inventory item."
        ) from exc


def adjust_inventory_stock(
    db: Session,
    product_id: int,
    user_id: int,
    transaction_type: str,
    quantity: int,
    remarks: str | None = None,
) -> None:
    try:
        repository.adjust_inventory_stock(
            db=db,
            product_id=product_id,
            user_id=user_id,
            transaction_type=transaction_type,
            quantity=quantity,
            remarks=remarks,
        )

        db.commit()

    except IntegrityError as exc:
        db.rollback()
        raise InventoryConflictError(
            "The stock adjustment references invalid data."
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise InventoryOperationError(
            "Unable to adjust stock. Verify the product, user, "
            "transaction type, and available quantity."
        ) from exc
