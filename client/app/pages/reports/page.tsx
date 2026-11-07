import type { Metadata } from "next";
import OrganizationSetup from "@/components/features/users/organizations/OrganizationSetup";
import { getOrganizationPageContext } from "@/lib/organization/page-context";
import { normalizeRole } from "@/lib/auth/roles";
import { ApiError } from "@/lib/api/client";
import {
  getInventoryReport,
  type InventoryReportData,
  type ReportPeriod,
} from "@/lib/api/reports";
import ReportsHeader from "@/components/features/reports/ReportsHeader";
import ReportStats from "@/components/features/reports/ReportStats";
import StockMovementChart from "@/components/features/reports/charts/StockMovementChart";
import CategoryShare from "@/components/features/reports/charts/CategoryShare";
import TopProductsTable from "@/components/features/reports/TopProductsTable";
import ReportFooterStats from "@/components/features/reports/ReportFooter";
import styles from "@/styles/reports/ReportsPage.module.css";
import { listCategories } from "@/lib/api/inventory";
import {
  getUsageAnalyticsSummary,
  type UsageAnalyticsSummary,
} from "@/lib/api/reports";
import UsageAnalyticsCard from "@/components/features/reports/UsageAnalyticsCard";
import { getUsageAnalyticsConsent } from "@/lib/api/settings";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    offset?: string;
  }>;
}) {
  const { session, organization } = await getOrganizationPageContext();
  if (!organization) return <OrganizationSetup />;
  const params = await searchParams;
  const parsedDays = Number(params.days);
  const days: ReportPeriod =
    parsedDays === 30 || parsedDays === 90 ? parsedDays : 365;
  const parsedOffset = Number(params.offset);
  const offset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 && parsedOffset <= 100
      ? parsedOffset
      : 0;
  if (normalizeRole(session.role) === "staff") {
    return (
      <div className={`${styles.page} pageEnterReports`}>
        <ReportsHeader days={days} />
        <section className={styles.accessNotice}>
          <h2>Reports are for Owners and Managers</h2>
          <p>
            Ask your organization owner to change your role if you need access
            to reports.
          </p>
        </section>
      </div>
    );
  }

  let report: InventoryReportData;
  let categoryNames: string[] = [];
  let usageSummary: UsageAnalyticsSummary | null = null;
  try {
    // Yearly reports stay anchored on the latest years even if an old URL
    // still contains the removed year_offset navigation parameter.
    report = await getInventoryReport(days, offset);
    try {
      categoryNames = (await listCategories()).map((category) => category.name);
    } catch (error) {
      console.error("[StockWise] Unable to load report categories:", error);
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Unable to load reports. Please try again.";
    return (
      <div className={`${styles.page} pageEnterReports`}>
        <ReportsHeader days={days} />
        <section className={styles.reportError} role="alert">
          <h2>Unable to load reports</h2>
          <p>{message}</p>
          <a href={`/pages/reports?days=${days}`}>Try again</a>
        </section>
      </div>
    );
  }

  try {
    const analyticsConsent = await getUsageAnalyticsConsent();
    if (analyticsConsent.enabled) {
      usageSummary = await getUsageAnalyticsSummary(30);
    }
  } catch (error) {
    console.error("[StockWise] Unable to load anonymous usage analytics:", error);
  }

  return (
    <div className={`${styles.page} pageEnterReports`}>
      <div className="pageEnterBlock"><ReportsHeader days={days} report={report} /></div>
      <div className="pageEnterBlock pageEnterDelay1"><ReportStats report={report} /></div>
      {usageSummary && <div className="pageEnterBlock pageEnterDelay2"><UsageAnalyticsCard summary={usageSummary} /></div>}
      <div className="pageEnterBlock pageEnterDelay3"><div className={styles.chartsRow}>
        <StockMovementChart report={report} />
        <CategoryShare report={report} categoryNames={categoryNames} />
      </div></div>
      <div className="pageEnterBlock pageEnterDelay4"><TopProductsTable report={report} /></div>
      <div className="pageEnterBlock pageEnterDelay5"><ReportFooterStats report={report} /></div>
    </div>
  );
}
