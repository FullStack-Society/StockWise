import type { Metadata } from "next";
import InventoryBrowser from "@/components/features/inventory/InventoryBrowser";
import InventoryStats from "@/components/features/inventory/InventoryFooter";
import OrganizationSetup from "@/components/features/users/organizations/OrganizationSetup";
import styles from "@/styles/inventory/InventoryPage.module.css";
import { getOrganizationPageContext } from "@/lib/organization/page-context";
import { getAccountSettings, getInventoryDefaults } from "@/lib/api/settings";
import {
  listCategories,
  listInventoryLocations,
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
  const [locations, categories, params, settings, inventoryDefaults] = await Promise.all([
    listInventoryLocations(),
    listCategories(),
    searchParams,
    getAccountSettings(),
    getInventoryDefaults(),
  ]);
  if (locations.length === 0)
    throw new Error(
      "No inventory locations are configured for this organization.",
    );
  const view = parseSearchParams(params);
  const selectedLocation =
    locations.find(
      (location) => String(location.id) === view.filters.locationId,
    ) ?? locations[0];
  const filters = {
    ...view.filters,
    locationId: String(selectedLocation.id),
  };
  const [products, history] = await Promise.all([
    listProducts(selectedLocation.id),
    listInventoryMovements(selectedLocation.id),
  ]);
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
        locationId={selectedLocation.id}
        defaultReorderPoint={inventoryDefaults.default_reorder_point}
        history={history}
        filters={filters}
      /></div>
      <div className="pageEnterBlock pageEnterDelay1"><InventoryStats items={buildInventoryStats(products)} /></div>
    </div>
  );
}
