from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ReportProduct(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    quantity: int
    minimum_stock: int
    price: Decimal
    units_issued: int
    previous_units_issued: int


class MonthlyMovement(BaseModel):
    month: date
    units_received: int
    units_issued: int


class InventoryReport(BaseModel):
    days: int
    period_start: date
    product_count: int
    stock_units: int
    inventory_value: Decimal
    low_stock_count: int
    out_of_stock_count: int
    units_received: int
    units_issued: int
    transaction_count: int
    previous_units_received: int
    previous_units_issued: int
    previous_transaction_count: int
    products: list[ReportProduct]
    monthly_movement: list[MonthlyMovement]
