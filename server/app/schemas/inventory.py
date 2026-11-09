
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def valid_upc_a(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    if len(value) != 12 or not value.isdigit():
        raise ValueError("UPC-A must contain exactly 12 digits.")
    return value


class InventoryCreate(BaseModel):
    product_name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=100)
    upc: str | None = Field(default=None, max_length=12)
    category_id: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    variant: str | None = Field(default=None, max_length=200)
    quantity: int = Field(default=0, ge=0, le=2_147_483_647)
    reorder_point: int = Field(default=50, ge=0, le=2_147_483_647)

    @field_validator("product_name", "sku")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized

    @field_validator("upc")
    @classmethod
    def validate_upc(cls, value: str | None) -> str | None:
        return valid_upc_a(value.strip() if value else value)


class InventoryUpdate(BaseModel):
    product_name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=100)
    upc: str | None = Field(default=None, max_length=12)
    category_id: int | None = Field(gt=0)
    description: str | None = Field(max_length=2000)
    price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    variant: str | None = Field(default=None, max_length=200)
    quantity: int = Field(ge=0, le=2_147_483_647)
    reorder_point: int = Field(ge=0, le=2_147_483_647)

    @field_validator("product_name", "sku")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized

    @field_validator("upc")
    @classmethod
    def validate_upc(cls, value: str | None) -> str | None:
        return valid_upc_a(value.strip() if value else value)


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    product_name: str
    sku: str
    upc: str | None = None
    category_id: int | None
    description: str | None
    price: Decimal
    variant: str | None = None
    quantity: int
    reorder_point: int
    created_at: datetime
    updated_at: datetime
    category_name: str | None
    status: str


class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    description: str | None


class InventoryCategoryCreate(BaseModel):
    category_name: str = Field(min_length=1, max_length=100)

    @field_validator("category_name")
    @classmethod
    def normalize_category_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Category name cannot be blank.")
        return normalized


class StockAdjustment(BaseModel):
    transaction_type: Literal["OUT", "ADJUST"]
    quantity: int = Field(ge=-2_147_483_647, le=2_147_483_647)
    remarks: str = Field(min_length=1, max_length=500)


class StocktakeCreate(BaseModel):
    counted_quantity: int = Field(ge=0, le=2_147_483_647)
    remarks: str = Field(min_length=1, max_length=500)


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
