from decimal import Decimal

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.db import inventory_repository


class SaleProductNotFoundError(Exception):
    """Raised when a checkout references a missing organization product."""


def get_existing_sale_items_sold(
    db: Session, organization_id: int, sale_id: str
) -> int | None:
    count = db.execute(
        text("""
            SELECT COUNT(item.product_id)
            FROM public.sales AS sale
            LEFT JOIN public.sale_items AS item
              ON item.organization_id = sale.organization_id
             AND item.sale_id = sale.sale_id
            WHERE sale.organization_id = :organization_id
              AND sale.sale_id = CAST(:sale_id AS uuid)
            GROUP BY sale.sale_id
        """),
        {"organization_id": organization_id, "sale_id": sale_id},
    ).scalar_one_or_none()
    return int(count) if count is not None else None


def create_sale(
    db: Session,
    organization_id: int,
    email: str,
    sale_id: str,
    payment_method: str,
    items: list[dict],
) -> int:
    existing_result = get_existing_sale_items_sold(db, organization_id, sale_id)
    if existing_result is not None:
        return existing_result

    actor_email = email.strip().lower()
    ordered_items = sorted(items, key=lambda value: value["product_id"])
    product_ids = [item["product_id"] for item in ordered_items]

    product_rows = db.execute(
        text("""
            SELECT product_id, price
            FROM public.products
            WHERE organization_id = :organization_id
              AND product_id IN :product_ids
              AND is_deleted = false
            ORDER BY product_id
            FOR UPDATE
        """).bindparams(bindparam("product_ids", expanding=True)),
        {"organization_id": organization_id, "product_ids": product_ids},
    ).mappings().all()
    if len(product_rows) != len(ordered_items):
        raise SaleProductNotFoundError("A product in this sale no longer exists.")

    price_by_product = {
        int(row["product_id"]): Decimal(row["price"]).quantize(Decimal("0.01"))
        for row in product_rows
    }

    db.execute(
        text("SELECT set_config('app.actor_email', :email, true)"),
        {"email": actor_email},
    )

    db.execute(
        text("""
            INSERT INTO public.sales (
                organization_id, sale_id, payment_method, created_by_email
            ) VALUES (
                :organization_id, CAST(:sale_id AS uuid),
                :payment_method, :created_by_email
            )
        """),
        {
            "organization_id": organization_id,
            "sale_id": sale_id,
            "payment_method": payment_method,
            "created_by_email": actor_email,
        },
    )

    for item in ordered_items:
        db.execute(
            text("""
                INSERT INTO public.sale_items (
                    organization_id, sale_id, product_id, quantity, unit_price
                ) VALUES (
                    :organization_id, CAST(:sale_id AS uuid),
                    :product_id, :quantity, :unit_price
                )
            """),
            {
                "organization_id": organization_id,
                "sale_id": sale_id,
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "unit_price": price_by_product[item["product_id"]],
            },
        )
        inventory_repository.adjust_inventory_stock(
            db=db,
            organization_id=organization_id,
            email=actor_email,
            product_id=item["product_id"],
            transaction_type="OUT",
            quantity=item["quantity"],
            remarks=f"Sale {sale_id} | payment:{payment_method}",
        )
    db.commit()
    return len(items)
