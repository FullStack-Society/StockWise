import type { Metadata } from "next";
import InventoryBrowser from "@/components/features/inventory/InventoryBrowser";
import InventoryStats from "@/components/features/inventory/InventoryFooter";
import OrganizationSetup from "@/components/features/users/organizations/OrganizationSetup";
import styles from "@/styles/inventory/InventoryPage.module.css";
import { getOrganizationPageContext } from "@/lib/organization/page-context";
import { getAccountSettings, getInventoryDefaults } from "@/lib/api/settings";
import {
  listCategories,
  listInventoryMovements,
  listProducts,
} from "@/lib/api/inventory";
import { buildInventoryStats } from "@/lib/inventory/stats";
import { applyView, parseSearchParams } from "@/lib/inventory/query";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Inventory" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InventoryPage({ searchParams }: PageProps) {
  const { organization } = await getOrganizationPageContext();
  if (!organization) return <OrganizationSetup />;
  const [categories, params, settings, inventoryDefaults, products, history] = await Promise.all([
    listCategories(),
    searchParams,
    getAccountSettings(),
    getInventoryDefaults(),
    listProducts(),
    listInventoryMovements(),
  ]);
  const view = parseSearchParams(params);
  const filters = view.filters;
  const inventory = applyView(
    products,
    { ...view, filters },
    settings.prioritize_low_stock,
  );

  return (
    <div className={`${styles.page} pageEnterInventory`}>
      <div className="pageEnterBlock"><InventoryBrowser
        {...inventory}
        exportProducts={products}
        categories={categories}
        defaultReorderPoint={inventoryDefaults.default_reorder_point}
        history={history}
        filters={filters}
      /></div>
      <div className="pageEnterBlock pageEnterDelay1"><InventoryStats items={buildInventoryStats(products)} /></div>
    </div>
  );
}
