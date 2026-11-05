from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PurchaseOrderItemCreate(BaseModel):
    product_id: int = Field(gt=0, le=2_147_483_647)
    quantity_ordered: int = Field(gt=0, le=2_147_483_647)


class PurchaseOrderCreate(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)
    items: list[PurchaseOrderItemCreate] = Field(min_length=1, max_length=100)


class PurchaseOrderReceipt(BaseModel):
    quantity: int = Field(gt=0, le=2_147_483_647)


class PurchaseOrderItemResponse(BaseModel):
    item_id: int
    product_id: int
    product_name: str
    sku: str
    quantity_ordered: int
    quantity_received: int
    quantity_remaining: int


class PurchaseOrderResponse(BaseModel):
    order_id: int
    notes: str | None
    created_by_email: str
    created_at: datetime
    status: Literal["Open", "Partially received", "Received"]
    items: list[PurchaseOrderItemResponse]
