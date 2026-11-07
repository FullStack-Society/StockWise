from pathlib import Path
import unittest

from pydantic import ValidationError

from app.schemas.inventory import InventoryCreate


ROOT = Path(__file__).resolve().parents[2]


class InventoryCostLotTests(unittest.TestCase):
    def test_product_accepts_separate_cost_price_and_lot_fields(self):
        product = InventoryCreate(
            product_name="Demo item", sku="DEMO-1", price="12.50",
            unit_cost="8.25", variant="Small", location_id=1,
        )
        self.assertEqual(str(product.price), "12.50")
        self.assertEqual(str(product.unit_cost), "8.25")
        self.assertEqual(product.variant, "Small")

    def test_cost_fields_reject_negative_values(self):
        with self.assertRaises(ValidationError):
            InventoryCreate(product_name="Demo", sku="DEMO", price="-1", location_id=1)
        with self.assertRaises(ValidationError):
            InventoryCreate(product_name="Demo", sku="DEMO", unit_cost="-1", location_id=1)

    def test_inventory_migration_has_cost_fields_without_optional_batch_features(self):
        migration = (ROOT / "migrations" / "012_inventory_costs_variants.sql").read_text().lower()
        for contract in (
            "unit_cost numeric", "variant varchar",
            "public.schema_migrations",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, migration)
        self.assertNotIn("create table if not exists public.sales", migration)
        self.assertNotIn("inventory_lots", migration)
        removal = (ROOT / "migrations" / "013_remove_barcode.sql").read_text().lower()
        self.assertIn("drop column if exists barcode", removal)

    def test_inventory_stock_cost_report_uses_tenant_scoped_stock(self):
        repository = (ROOT / "server" / "app" / "db" / "report_repository.py").read_text().lower()
        self.assertIn("s.organization_id=:org", repository)
        self.assertIn("sum(s.quantity * p.unit_cost)", repository)
        self.assertIn("stock_cost_value", repository)


if __name__ == "__main__":
    unittest.main()
