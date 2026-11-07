import type { Metadata } from "next";
import StatCard from "@/components/features/dashboard/StatCard";
import RecentInventory from "@/components/features/dashboard/RecentInventory";
import StockFlowTrend from "@/components/features/dashboard/StockFlowTrend";
import DashboardFooter from "@/components/features/dashboard/DashboardFooter";
import DashboardLocationSelect from "@/components/features/dashboard/DashboardLocationSelect";
import LowStockItems from "@/components/features/dashboard/LowStockItems";
import OrganizationSetup from "@/components/features/users/organizations/OrganizationSetup";
import { getOrganizationPageContext } from "@/lib/organization/page-context";
import { listInventoryLocations, listProducts } from "@/lib/api/inventory";
import { listPurchaseOrders } from "@/lib/api/orders";
import { getDashboardStockFlow } from "@/lib/api/reports";
import { buildDashboardStats } from "@/lib/dashboard/stats";
import styles from "@/styles/dashboard/DashboardPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; location?: string }>;
}) {
  const { organization } = await getOrganizationPageContext();
  if (!organization) return <OrganizationSetup />;
  const params = await searchParams;
  const parsedDays = Number(params.days);
  const days: 7 | 14 | 30 =
    parsedDays === 14 || parsedDays === 30 ? parsedDays : 7;
  const [locations, stockFlow, orders] = await Promise.all([
    listInventoryLocations(),
    getDashboardStockFlow(days),
    listPurchaseOrders(),
  ]);
  const requestedLocation = Number(params.location);
  const location =
    locations.find((item) => item.id === requestedLocation) ?? locations[0];
  const products = location ? await listProducts(location.id) : [];
  const stats = location ? buildDashboardStats(products, location) : [];

  return (
    <div className={`${styles.page} pageEnterDashboard`}>
      <div className="pageEnterBlock"><header className={styles.header}>
        <div>
          <h1>Dashboard</h1>
          <p>Inventory and purchase activity at a glance.</p>
        </div>
        {location && locations.length > 1 && (
          <DashboardLocationSelect locations={locations} selectedId={location.id} />
        )}
      </header></div>
      <div className="pageEnterBlock pageEnterDelay1"><section className={styles.stats}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section></div>

      <div className="pageEnterBlock pageEnterDelay2"><div className={styles.mainPanels}>
        <RecentInventory
          products={products}
          recentProducts={stockFlow.recent_products}
        />
        <StockFlowTrend stockFlow={stockFlow} days={days} orders={orders} />
      </div></div>
      {location && <div className="pageEnterBlock pageEnterDelay3"><LowStockItems products={products} locationId={location.id} /></div>}
      <div className="pageEnterBlock pageEnterDelay4"><DashboardFooter products={products} orders={orders} /></div>
    </div>
  );
}
