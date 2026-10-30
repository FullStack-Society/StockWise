
from sqlalchemy import text
from sqlalchemy.orm import Session


def ensure_default_categories(db: Session, organization_id: int) -> None:
    db.execute(
        text("SELECT public.stockwise_ensure_default_categories(:organization_id)"),
        {"organization_id": organization_id},
    )
    db.commit()


def get_inventory_list(
    db: Session,
    organization_id: int,
    search: str | None = None,
    category_id: int | None = None,
    stock_status: str | None = None,
) -> list[dict]:
    result = db.execute(
        text("""
            SELECT *
            FROM organization_get_inventory(
                :p_organization_id,
                :p_search,
                :p_category_id,
                :p_stock_status
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_search": search,
            "p_category_id": category_id,
            "p_stock_status": stock_status,
        },
    )

    return [dict(row) for row in result.mappings().all()]


def get_inventory_by_id(
    db: Session,
    organization_id: int,
    product_id: int,
) -> dict | None:
    result = db.execute(
        text("""
            SELECT *
            FROM organization_get_inventory_by_id(
                :p_organization_id, :p_product_id
            )
        """),
        {"p_organization_id": organization_id, "p_product_id": product_id},
    )

    row = result.mappings().first()
    return dict(row) if row is not None else None


def get_categories(db: Session, organization_id: int) -> list[dict]:
    result = db.execute(
        text("""
            SELECT *
            FROM organization_get_categories(:p_organization_id)
        """),
        {"p_organization_id": organization_id},
    )

    return [dict(row) for row in result.mappings().all()]


def create_inventory(
    db: Session,
    organization_id: int,
    product_name: str,
    sku: str,
    category_id: int | None,
    description: str | None,
    price,
    quantity: int,
) -> dict:
    result = db.execute(
        text("""
            SELECT *
            FROM organization_create_inventory(
                :p_organization_id,
                :p_product_name,
                :p_sku,
                :p_category_id,
                :p_description,
                :p_price,
                :p_quantity
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_product_name": product_name,
            "p_sku": sku,
            "p_category_id": category_id,
            "p_description": description,
            "p_price": price,
            "p_quantity": quantity,
        },
    )

    row = result.mappings().one()
    return dict(row)


def update_inventory(
    db: Session,
    organization_id: int,
    product_id: int,
    product_name: str,
    sku: str,
    category_id: int | None,
    description: str | None,
    price,
    quantity: int,
) -> dict | None:
    result = db.execute(
        text("""
            SELECT *
            FROM organization_update_inventory(
                :p_organization_id,
                :p_product_id,
                :p_product_name,
                :p_sku,
                :p_category_id,
                :p_description,
                :p_price,
                :p_quantity
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_product_id": product_id,
            "p_product_name": product_name,
            "p_sku": sku,
            "p_category_id": category_id,
            "p_description": description,
            "p_price": price,
            "p_quantity": quantity,
        },
    )

    row = result.mappings().first()
    return dict(row) if row is not None else None


def delete_inventory(db: Session, organization_id: int, product_id: int) -> bool:
    result = db.execute(
        text("""
            SELECT organization_delete_inventory(
                :p_organization_id, :p_product_id
            )
        """),
        {"p_organization_id": organization_id, "p_product_id": product_id},
    )

    return bool(result.scalar_one())


def adjust_inventory_stock(
    db: Session,
    product_id: int,
    user_id: int,
    transaction_type: str,
    quantity: int,
    remarks: str | None = None,
) -> None:
    db.execute(
        text("""
            CALL adjust_inventory_stock(
                :p_product_id,
                :p_user_id,
                :p_transaction_type,
                :p_quantity,
                :p_remarks
            )
        """),
        {
            "p_product_id": product_id,
            "p_user_id": user_id,
            "p_transaction_type": transaction_type,
            "p_quantity": quantity,
            "p_remarks": remarks,
        },
    )
