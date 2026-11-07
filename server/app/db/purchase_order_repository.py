import json

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_purchase_order(
    db: Session,
    organization_id: int,
    email: str,
    notes: str | None,
    items: list[dict],
) -> int:
    result = db.execute(
        text("""
            SELECT public.stockwise_create_purchase_order(
                :p_organization_id,
                :p_email,
                :p_notes,
                CAST(:p_items AS jsonb)
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_notes": notes,
            "p_items": json.dumps(items),
        },
    )
    return int(result.scalar_one())


def update_purchase_order(
    db: Session,
    organization_id: int,
    email: str,
    order_id: int,
    notes: str | None,
    items: list[dict],
) -> None:
    db.execute(
        text("SELECT set_config('app.actor_email', :p_email, true)"),
        {"p_email": email.strip().lower()},
    )
    db.execute(
        text("""
            SELECT public.stockwise_update_purchase_order(
                :p_organization_id,
                :p_email,
                :p_order_id,
                :p_notes,
                CAST(:p_items AS jsonb)
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_order_id": order_id,
            "p_notes": notes,
            "p_items": json.dumps(items),
        },
    )


def get_purchase_orders(
    db: Session,
    organization_id: int,
    order_id: int | None = None,
    limit: int = 100,
) -> list[dict]:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_get_purchase_orders(
                :p_organization_id, :p_order_id, :p_limit
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_order_id": order_id,
            "p_limit": limit,
        },
    )
    return [dict(row) for row in result.mappings().all()]


def get_purchase_order_history(
    db: Session, organization_id: int, limit: int = 200
) -> list[dict]:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_get_purchase_order_history(
                :p_organization_id, :p_limit
            )
        """),
        {"p_organization_id": organization_id, "p_limit": limit},
    )
    return [dict(row) for row in result.mappings().all()]


def delete_purchase_order(
    db: Session, organization_id: int, email: str, order_id: int
) -> None:
    db.execute(
        text("SELECT set_config('app.actor_email', :p_email, true)"),
        {"p_email": email.strip().lower()},
    )
    db.execute(
        text("""
            SELECT public.stockwise_delete_purchase_order(
                :p_organization_id, :p_email, :p_order_id
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_order_id": order_id,
        },
    )


def receive_purchase_order_item(
    db: Session,
    organization_id: int,
    email: str,
    order_id: int,
    item_id: int,
    quantity: int,
) -> dict:
    db.execute(
        text("SELECT set_config('app.actor_email', :p_email, true)"),
        {"p_email": email.strip().lower()},
    )
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_receive_purchase_order_item(
                :p_organization_id,
                :p_email,
                :p_order_id,
                :p_item_id,
                :p_quantity
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_order_id": order_id,
            "p_item_id": item_id,
            "p_quantity": quantity,
        },
    )
    return dict(result.mappings().one())
