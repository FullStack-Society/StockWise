import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OrdersBrowser from "@/components/features/orders/OrdersBrowser";
import { listOrganizations } from "@/lib/api/organizations";
import { listPurchaseOrders } from "@/lib/api/orders";
import { listProducts } from "@/lib/api/inventory";
import { requireOrganizationSession } from "@/lib/auth/session";
import { buildPurchaseOrderStats } from "@/lib/orders/stats";
import InventoryFooter from "@/components/features/inventory/InventoryFooter";
import styles from "@/styles/orders/OrdersPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Orders" };

export default async function OrdersPage() {
  const session = await requireOrganizationSession();
  const organizations = await listOrganizations(session.email);
  if (
    !organizations.some((org) => org.organization_id === session.organizationId)
  ) {
    redirect("/pages/users");
  }
  const [orders, products] = await Promise.all([
    listPurchaseOrders(),
    listProducts(),
  ]);
  return (
    <div className={styles.page}>
      <OrdersBrowser orders={orders} products={products} />
      <div className={styles.statsFooter}>
        <InventoryFooter items={buildPurchaseOrderStats(orders)} />
      </div>
    </div>
  );
}
