import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StatCard from "@/components/features/dashboard/StatCard";
import RecentInventory from "@/components/features/dashboard/RecentInventory";
import QuickStats from "@/components/features/dashboard/QuickStats";
import { requireOrganizationSession } from "@/lib/auth/session";
import { listProducts } from "@/lib/api/inventory";
import { listOrganizations } from "@/lib/api/organizations";
import { buildDashboardStats } from "@/lib/inventory/stats";
import styles from "@/styles/dashboard/DashboardPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Dashboard" };

export default async function DashboardPage() {
  const session = await requireOrganizationSession();
  const organizations = await listOrganizations(session.email);
  if (
    !organizations.some((org) => org.organization_id === session.organizationId)
  ) {
    redirect("/pages/users");
  }
  const products = await listProducts();
  const stats = buildDashboardStats(products);

  return (
    <div className={styles.page}>
      <section className={styles.stats}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className={styles.grid}>
        <RecentInventory products={products} />
        <QuickStats products={products} />
      </div>
    </div>
  );
}
