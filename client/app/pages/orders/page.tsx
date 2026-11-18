import type { Metadata } from "next";
import OrdersBrowser from "@/components/features/orders/OrdersBrowser";
import OrganizationSetup from "@/components/features/users/organizations/OrganizationSetup";
import {
  listPurchaseOrderHistory,
  listPurchaseOrders,
} from "@/lib/api/orders";
import { listProducts } from "@/lib/api/inventory";
import { getOrganizationPageContext } from "@/lib/organization/page-context";
import { buildPurchaseOrderStats } from "@/lib/orders/stats";
import InventoryFooter from "@/components/features/inventory/InventoryFooter";
import styles from "@/styles/orders/OrdersPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Orders" };

export default async function OrdersPage() {
  const { organization } = await getOrganizationPageContext();
  if (!organization) return <OrganizationSetup />;
  const [orders, products, history] = await Promise.all([
    listPurchaseOrders(),
    listProducts(),
    listPurchaseOrderHistory(),
  ]);
  return (
    <div className={`${styles.page} pageEnterOrders`}>
      <div className="pageEnterBlock"><OrdersBrowser orders={orders} products={products} history={history} /></div>
      <div className="pageEnterBlock pageEnterDelay1"><InventoryFooter items={buildPurchaseOrderStats(orders)} /></div>
    </div>
  );
}
