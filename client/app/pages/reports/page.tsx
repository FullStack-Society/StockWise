import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import ReportsHeader from "@/components/features/reports/ReportsHeader";
import ReportStats from "@/components/features/reports/ReportStats";
import SalesTrendChart from "@/components/features/reports/SalesTrendChart";
import CategoryShare from "@/components/features/reports/CategoryShare";
import TopProductsTable from "@/components/features/reports/TopProductsTable";
import ReportFooterStats from "@/components/features/reports/ReportFooterStats";
import styles from "@/styles/reports/ReportsPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Reports" };

export default async function ReportsPage() {
  await requireSession();

  return (
    <div className={styles.page}>
      <ReportsHeader />
      <ReportStats />
      <div className={styles.chartsRow}>
        <SalesTrendChart />
        <CategoryShare />
      </div>
      <TopProductsTable />
      <ReportFooterStats />
    </div>
  );
}
