from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class ReportProduct(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    quantity: int
    price: Decimal
    units_issued: int
    previous_units_issued: int


class MonthlyMovement(BaseModel):
    month: date
    units_received: int
    units_issued: int


class DailyMovement(BaseModel):
    day: date
    units_received: int
    units_issued: int
    received_value: Decimal


class YearlyMovement(BaseModel):
    year: int
    units_received: int
    units_issued: int
    received_value: Decimal


class DailyStockFlow(BaseModel):
    day: date
    units_received: int


class DashboardStockReceipt(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity: int
    received_at: datetime


class DashboardRecentProduct(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity: int
    received_at: datetime


class InventoryReport(BaseModel):
    days: int
    period_start: date
    product_count: int
    stock_units: int
    inventory_value: Decimal
    stock_cost_value: Decimal
    low_stock_count: int
    critical_count: int
    units_received: int
    units_issued: int
    transaction_count: int
    previous_units_received: int
    previous_units_issued: int
    previous_transaction_count: int
    monthly_transaction_count: int
    monthly_units_received: int
    monthly_units_issued: int
    products: list[ReportProduct]
    monthly_movement: list[MonthlyMovement]
    daily_movement: list[DailyMovement]
    yearly_movement: list[YearlyMovement]


class DashboardStockFlow(BaseModel):
    days: list[DailyStockFlow]
    recent_receipts: list[DashboardStockReceipt]
    recent_products: list[DashboardRecentProduct]


class UsageAnalyticsPageSummary(BaseModel):
    page: str
    views: int


class UsageAnalyticsSummary(BaseModel):
    days: int
    total_views: int
    by_page: list[UsageAnalyticsPageSummary]
