import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InventoryBrowser from "@/components/features/inventory/InventoryBrowser";
import InventoryStats from "@/components/features/inventory/InventoryFooter";
import styles from "@/styles/inventory/InventoryPage.module.css";
import { requireOrganizationSession } from "@/lib/auth/session";
import { getAccountSettings } from "@/lib/api/settings";
import {
  listCategories,
  listInventoryLocations,
  listInventoryMovements,
  listProducts,
} from "@/lib/api/inventory";
import { listOrganizations } from "@/lib/api/organizations";
import { buildInventoryStats } from "@/lib/inventory/stats";
import { applyView, parseSearchParams } from "@/lib/inventory/query";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Inventory" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InventoryPage({ searchParams }: PageProps) {
  const session = await requireOrganizationSession();
  const organizations = await listOrganizations(session.email);
  if (
    !organizations.some((org) => org.organization_id === session.organizationId)
  ) {
    redirect("/pages/users");
  }
  const [locations, categories, params, settings] = await Promise.all([
    listInventoryLocations(),
    listCategories(),
    searchParams,
    getAccountSettings(),
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
    <div className={styles.page}>
      <InventoryBrowser
        {...inventory}
        exportProducts={products}
        categories={categories}
        locationId={selectedLocation.id}
        history={history}
        filters={filters}
      />
      <InventoryStats items={buildInventoryStats(products)} />
    </div>
  );
}
