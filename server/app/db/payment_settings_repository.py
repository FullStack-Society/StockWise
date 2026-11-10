from sqlalchemy import text
from sqlalchemy.orm import Session


def get_merchant_qr(db: Session, organization_id: int) -> str | None:
    return db.execute(
        text("""
            SELECT merchant_qr_data
            FROM public.organization_payment_settings
            WHERE organization_id = :organization_id
        """),
        {"organization_id": organization_id},
    ).scalar_one_or_none()


def save_merchant_qr(
    db: Session, organization_id: int, email: str, image_data: str
) -> None:
    db.execute(
        text("""
            INSERT INTO public.organization_payment_settings (
                organization_id, merchant_qr_data, updated_by_email, updated_at
            ) VALUES (
                :organization_id, :image_data, :email, CURRENT_TIMESTAMP
            )
            ON CONFLICT (organization_id) DO UPDATE
            SET merchant_qr_data = EXCLUDED.merchant_qr_data,
                updated_by_email = EXCLUDED.updated_by_email,
                updated_at = CURRENT_TIMESTAMP
        """),
        {
            "organization_id": organization_id,
            "image_data": image_data,
            "email": email.strip().lower(),
        },
    )
