
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_inventory_list(
    db: Session,
    organization_id: int,
    location_id: int,
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
                :p_stock_status,
                :p_location_id
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_search": search,
            "p_category_id": category_id,
            "p_stock_status": stock_status,
            "p_location_id": location_id,
        },
    )

    rows = [dict(row) for row in result.mappings().all()]
    return _enrich_retail_fields(db, rows)


def _enrich_retail_fields(db: Session, rows: list[dict]) -> list[dict]:
    if not rows:
        return rows
    ids = list({int(row["product_id"]) for row in rows})
    details = db.execute(
        text("""
            SELECT product_id, unit_cost, variant
            FROM public.products WHERE product_id = ANY(:ids)
        """), {"ids": ids}
    ).mappings().all()
    by_id = {int(item["product_id"]): dict(item) for item in details}
    for row in rows:
        row.update(by_id.get(int(row["product_id"]), {}))
    return rows


def get_inventory_by_id(
    db: Session,
    organization_id: int,
    product_id: int,
    location_id: int,
) -> dict | None:
    result = db.execute(
        text("""
            SELECT *
            FROM organization_get_inventory_by_id(
                :p_organization_id, :p_product_id, :p_location_id
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_product_id": product_id,
            "p_location_id": location_id,
        },
    )

    row = result.mappings().first()
    return _enrich_retail_fields(db, [dict(row)])[0] if row is not None else None


def get_categories(db: Session, organization_id: int) -> list[dict]:
    result = db.execute(
        text("""
            SELECT *
            FROM organization_get_categories(:p_organization_id)
        """),
        {"p_organization_id": organization_id},
    )

    return [dict(row) for row in result.mappings().all()]


def create_category(
    db: Session, organization_id: int, category_name: str
) -> dict:
    result = db.execute(
        text("""
            INSERT INTO public.categories
                (organization_id, category_name, description)
            VALUES (:p_organization_id, :p_category_name, NULL)
            RETURNING category_id, category_name, description
        """),
        {
            "p_organization_id": organization_id,
            "p_category_name": category_name,
        },
    )
    return dict(result.mappings().one())


def delete_category(
    db: Session, organization_id: int, category_id: int
) -> bool:
    result = db.execute(
        text("""
            DELETE FROM public.categories
            WHERE organization_id = :p_organization_id
              AND category_id = :p_category_id
            RETURNING category_id
        """),
        {
            "p_organization_id": organization_id,
            "p_category_id": category_id,
        },
    )
    return result.scalar_one_or_none() is not None


def create_inventory(
    db: Session,
    organization_id: int,
    product_name: str,
    sku: str,
    category_id: int | None,
    description: str | None,
    price,
    quantity: int,
    location_id: int,
    reorder_point: int,
    actor_email: str,
    unit_cost=0,
    variant: str | None = None,
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
                :p_quantity,
                :p_location_id,
                :p_reorder_point,
                :p_actor_email
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
            "p_location_id": location_id,
            "p_reorder_point": reorder_point,
            "p_actor_email": actor_email.strip().lower(),
        },
    )

    row = dict(result.mappings().one())
    db.execute(text("""
        UPDATE public.products SET unit_cost=:unit_cost, variant=:variant
        WHERE organization_id=:org AND product_id=:product
    """), {"unit_cost": unit_cost, "variant": variant,
          "org": organization_id,
          "product": row["product_id"]})
    return _enrich_retail_fields(db, [row])[0]


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
    location_id: int,
    reorder_point: int,
    unit_cost=None,
    variant: str | None = None,
    supplied_fields: set[str] | None = None,
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
                :p_quantity,
                :p_location_id,
                :p_reorder_point
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
            "p_location_id": location_id,
            "p_reorder_point": reorder_point,
        },
    )

    row = result.mappings().first()
    if row is None:
        return None
    fields = supplied_fields or set()
    retail_updates = []
    retail_params = {"org": organization_id, "product": product_id}
    if "unit_cost" in fields:
        retail_updates.append("unit_cost=:unit_cost")
        retail_params["unit_cost"] = unit_cost
    if "variant" in fields:
        retail_updates.append("variant=:variant")
        retail_params["variant"] = variant
    if retail_updates:
        db.execute(text(
            "UPDATE public.products SET " + ", ".join(retail_updates) +
            " WHERE organization_id=:org AND product_id=:product"
        ), retail_params)
    return _enrich_retail_fields(db, [dict(row)])[0]


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
    organization_id: int,
    email: str,
    location_id: int,
    product_id: int,
    transaction_type: str,
    quantity: int,
    remarks: str,
) -> int:
    result = db.execute(
        text("""
            SELECT public.stockwise_adjust_location_stock(
                :p_organization_id,
                :p_email,
                :p_location_id,
                :p_product_id,
                :p_transaction_type,
                :p_quantity,
                :p_remarks
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_location_id": location_id,
            "p_product_id": product_id,
            "p_transaction_type": transaction_type,
            "p_quantity": quantity,
            "p_remarks": remarks,
        },
    )
    return int(result.scalar_one())


def record_stocktake(
    db: Session,
    organization_id: int,
    email: str,
    location_id: int,
    product_id: int,
    counted_quantity: int,
    remarks: str,
) -> int:
    result = db.execute(
        text("""
            SELECT public.stockwise_record_stocktake(
                :p_organization_id,
                :p_email,
                :p_location_id,
                :p_product_id,
                :p_counted_quantity,
                :p_remarks
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_location_id": location_id,
            "p_product_id": product_id,
            "p_counted_quantity": counted_quantity,
            "p_remarks": remarks,
        },
    )
    return int(result.scalar_one())


def transfer_inventory_stock(
    db: Session,
    organization_id: int,
    email: str,
    source_location_id: int,
    destination_location_id: int,
    product_id: int,
    quantity: int,
    remarks: str,
) -> dict:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_transfer_location_stock(
                :p_organization_id,
                :p_email,
                :p_source_location_id,
                :p_destination_location_id,
                :p_product_id,
                :p_quantity,
                :p_remarks
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_source_location_id": source_location_id,
            "p_destination_location_id": destination_location_id,
            "p_product_id": product_id,
            "p_quantity": quantity,
            "p_remarks": remarks,
        },
    )
    return dict(result.mappings().one())


def get_inventory_locations(db: Session, organization_id: int) -> list[dict]:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_get_inventory_locations(
                :p_organization_id
            )
        """),
        {"p_organization_id": organization_id},
    )
    return [dict(row) for row in result.mappings().all()]


def create_inventory_location(
    db: Session, organization_id: int, location_name: str
) -> dict:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_create_inventory_location(
                :p_organization_id, :p_location_name
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_location_name": location_name,
        },
    )
    return dict(result.mappings().one())


def get_inventory_history(
    db: Session,
    organization_id: int,
    location_id: int,
    product_id: int | None,
    limit: int,
) -> list[dict]:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_get_inventory_history(
                :p_organization_id,
                :p_location_id,
                :p_product_id,
                :p_limit
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_location_id": location_id,
            "p_product_id": product_id,
            "p_limit": limit,
        },
    )
    return [dict(row) for row in result.mappings().all()]
