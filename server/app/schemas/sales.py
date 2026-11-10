from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class SaleItemCreate(BaseModel):
    product_id: int = Field(gt=0, le=2_147_483_647)
    quantity: int = Field(gt=0, le=2_147_483_647)


class SaleCreate(BaseModel):
    sale_id: UUID
    payment_method: Literal["cash", "card", "qr"]
    items: list[SaleItemCreate] = Field(min_length=1, max_length=100)


class SaleResponse(BaseModel):
    sale_id: UUID
    items_sold: int


class MerchantQrUpdate(BaseModel):
    image_data: str = Field(
        min_length=32,
        max_length=2_100_000,
        pattern=r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$",
    )


class MerchantQrResponse(BaseModel):
    image_data: str | None
