
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class InventoryCreate(BaseModel):
    product_name: str = Field(min_length=1)
    sku: str = Field(min_length=1)
    category_id: int | None = None
    description: str | None = None
    price: Decimal = Field(default=Decimal("0"), ge=0)
    quantity: int = Field(default=0, ge=0)


class InventoryUpdate(BaseModel):
    # PUT: provide all product fields when updating.
    product_name: str = Field(min_length=1)
    sku: str = Field(min_length=1)
    category_id: int | None
    description: str | None
    price: Decimal = Field(ge=0)
    quantity: int = Field(ge=0)


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    product_name: str
    sku: str
    category_id: int | None
    description: str | None
    price: Decimal
    quantity: int
    created_at: datetime
    updated_at: datetime
    category_name: str | None
    status: str


class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    description: str | None


class StockAdjustment(BaseModel):
    transaction_type: Literal["IN", "OUT"]
    quantity: int = Field(gt=0)
    remarks: str | None = None
