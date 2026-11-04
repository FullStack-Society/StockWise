
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
    quantity: int = Field(default=0, ge=0, le=2_147_483_647)
    location_id: int = Field(gt=0, le=2_147_483_647)
    reorder_point: int = Field(default=50, ge=0, le=2_147_483_647)


class InventoryUpdate(BaseModel):
    product_name: str = Field(min_length=1)
    sku: str = Field(min_length=1)
    category_id: int | None
    description: str | None
    price: Decimal = Field(ge=0)
    quantity: int = Field(ge=0, le=2_147_483_647)
    location_id: int = Field(gt=0, le=2_147_483_647)
    reorder_point: int = Field(ge=0, le=2_147_483_647)


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    product_name: str
    sku: str
    category_id: int | None
    description: str | None
    price: Decimal
    quantity: int
    reorder_point: int
    location_id: int
    location_name: str
    created_at: datetime
    updated_at: datetime
    category_name: str | None
    status: str


class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    description: str | None


class StockAdjustment(BaseModel):
    transaction_type: Literal["OUT", "ADJUST"]
    quantity: int = Field(ge=-2_147_483_647, le=2_147_483_647)
    remarks: str = Field(min_length=1, max_length=500)
    location_id: int = Field(gt=0, le=2_147_483_647)


class StocktakeCreate(BaseModel):
    counted_quantity: int = Field(ge=0, le=2_147_483_647)
    remarks: str = Field(min_length=1, max_length=500)
    location_id: int = Field(gt=0, le=2_147_483_647)


class StockTransfer(BaseModel):
    source_location_id: int = Field(gt=0, le=2_147_483_647)
    destination_location_id: int = Field(gt=0, le=2_147_483_647)
    quantity: int = Field(gt=0, le=2_147_483_647)
    remarks: str = Field(min_length=1, max_length=500)


class InventoryLocationCreate(BaseModel):
    location_name: str = Field(min_length=1, max_length=120)


class InventoryLocationResponse(BaseModel):
    location_id: int
    location_name: str
    created_at: datetime


class InventoryMovementResponse(BaseModel):
    movement_id: int
    occurred_at: datetime
    transaction_type: str
    product_id: int
    product_name: str
    sku: str
    quantity: int
    expected_quantity: int | None
    counted_quantity: int | None
    actor_email: str
    remarks: str | None
