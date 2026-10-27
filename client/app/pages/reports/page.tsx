import type { Metadata } from "next";
import { requireOrganizationSession } from "@/lib/auth/session";
import { normalizeRole } from "@/lib/auth/roles";
import { ApiError } from "@/lib/api/client";
import {
  getInventoryReport,
  type InventoryReportData,
  type ReportPeriod,
} from "@/lib/api/reports";
import ReportsHeader from "@/components/features/reports/ReportsHeader";
import ReportStats from "@/components/features/reports/ReportStats";
import SalesTrendChart from "@/components/features/reports/SalesTrendChart";
import CategoryShare from "@/components/features/reports/CategoryShare";
import TopProductsTable from "@/components/features/reports/TopProductsTable";
import ReportFooterStats from "@/components/features/reports/ReportFooterStats";
import styles from "@/styles/reports/ReportsPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await requireOrganizationSession();
  const params = await searchParams;
  const parsedDays = Number(params.days);
  const days: ReportPeriod =
    parsedDays === 30 || parsedDays === 90 ? parsedDays : 365;

  if (normalizeRole(session.role) === "staff") {
    return (
      <div className={styles.page}>
        <ReportsHeader days={days} />
        <section className={styles.accessNotice}>
          <h2>Reports are for Owners and Admins</h2>
          <p>
            Ask your organization owner to change your role if you need access
            to reports.
          </p>
        </section>
      </div>
    );
  }

  let report: InventoryReportData;
  try {
    report = await getInventoryReport(days);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Unable to load reports. Please try again.";
    return (
      <div className={styles.page}>
        <ReportsHeader days={days} />
        <section className={styles.reportError} role="alert">
          <h2>Unable to load reports</h2>
          <p>{message}</p>
          <a href={`/pages/reports?days=${days}`}>Try again</a>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ReportsHeader days={days} report={report} />
      <ReportStats report={report} />
      <div className={styles.chartsRow}>
        <SalesTrendChart report={report} />
        <CategoryShare report={report} />
      </div>
      <TopProductsTable report={report} />
      <ReportFooterStats report={report} />
    </div>
  );
}
