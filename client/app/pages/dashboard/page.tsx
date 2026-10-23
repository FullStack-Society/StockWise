import type { Metadata } from "next";
import StatCard from "@/components/features/dashboard/StatCard";
import RecentInventory from "@/components/features/dashboard/RecentInventory";
import StockFlowChart from "@/components/features/dashboard/StockFlowChart";
import QuickStats from "@/components/features/dashboard/QuickStats";
import { STATS } from "@/lib/mock-data/dashboard";
import { requireSession } from "@/lib/auth/session";
import styles from "@/styles/dashboard/DashboardPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Dashboard" };

export default async function DashboardPage() {
  await requireSession();

  return (
    <div className={styles.page}>
      <section className={styles.stats}>
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className={styles.grid}>
        <RecentInventory />
        <StockFlowChart />
      </div>

      <QuickStats />
    </div>
  );
}
