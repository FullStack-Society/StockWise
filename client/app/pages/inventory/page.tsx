import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InventoryBrowser from "@/components/features/inventory/InventoryBrowser";
import InventoryStats from "@/components/features/inventory/InventoryStats";
import styles from "@/styles/inventory/InventoryPage.module.css";
import { requireOrganizationSession } from "@/lib/auth/session";
import { listCategories, listProducts } from "@/lib/api/inventory";
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
  const [products, categories, params] = await Promise.all([
    listProducts(),
    listCategories(),
    searchParams,
  ]);
  const view = parseSearchParams(params);
  const inventory = applyView(products, view);

  return (
    <div className={styles.page}>
      <InventoryBrowser
        {...inventory}
        exportProducts={products}
        categories={categories}
        filters={view.filters}
      />
      <InventoryStats items={buildInventoryStats(products)} />
    </div>
  );
}
