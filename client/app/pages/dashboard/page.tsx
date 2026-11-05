import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StatCard from "@/components/features/dashboard/StatCard";
import RecentInventory from "@/components/features/dashboard/RecentInventory";
import StockFlowTrend from "@/components/features/dashboard/StockFlowTrend";
import DashboardFooter from "@/components/features/dashboard/DashboardFooter";
import { requireOrganizationSession } from "@/lib/auth/session";
import { listInventoryLocations, listProducts } from "@/lib/api/inventory";
import { listPurchaseOrders } from "@/lib/api/orders";
import { listOrganizations } from "@/lib/api/organizations";
import { getDashboardStockFlow } from "@/lib/api/reports";
import { buildDashboardStats } from "@/lib/dashboard/stats";
import styles from "@/styles/dashboard/DashboardPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await requireOrganizationSession();
  const organizations = await listOrganizations(session.email);
  if (
    !organizations.some((org) => org.organization_id === session.organizationId)
  ) {
    redirect("/pages/users");
  }
  const params = await searchParams;
  const parsedDays = Number(params.days);
  const days: 7 | 14 | 30 =
    parsedDays === 14 || parsedDays === 30 ? parsedDays : 7;
  const [locations, stockFlow, orders] = await Promise.all([
    listInventoryLocations(),
    getDashboardStockFlow(days),
    listPurchaseOrders(),
  ]);
  const location = locations[0];
  if (!location) {
    throw new Error(
      "No inventory locations are configured for this organization.",
    );
  }
  const products = await listProducts(location.id);
  const stats = buildDashboardStats(products, location);

  return (
    <div className={styles.page}>
      <section className={styles.stats}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className={styles.mainPanels}>
        <RecentInventory
          products={products}
          recentProducts={stockFlow.recent_products}
        />
        <StockFlowTrend stockFlow={stockFlow} days={days} orders={orders} />
      </div>
      <DashboardFooter products={products} orders={orders} />
    </div>
  );
}
