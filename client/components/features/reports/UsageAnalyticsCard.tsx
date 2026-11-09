import type { UsageAnalyticsSummary } from "@/lib/api/reports";
import styles from "@/styles/reports/UsageAnalyticsCard.module.css";

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  orders: "Orders",
  reports: "Reports",
  settings: "Settings",
  users: "Users",
};

export default function UsageAnalyticsCard({
  summary,
}: {
  summary: UsageAnalyticsSummary;
}) {
  return (
    <section className={styles.card} aria-labelledby="usage-analytics-title">
      <div className={styles.heading}>
        <div>
          <h2 id="usage-analytics-title">Anonymous App Usage</h2>
          <p>Last {summary.days} days · opted-in members only</p>
        </div>
        <strong>{summary.total_views.toLocaleString()} visits</strong>
      </div>
      {summary.by_page.length ? (
        <ul className={styles.list}>
          {summary.by_page.map(({ page, views }) => (
            <li key={page}>
              <span>{PAGE_LABELS[page] ?? page}</span>
              <strong>{views.toLocaleString()}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          No opted-in page visits have been collected yet. Members can enable
          this in Settings → Security &amp; Privacy.
        </p>
      )}
      <p className={styles.note}>
        Counts are grouped by page, organization, and day. No person or
        inventory details are included. Past totals remain after a member opts out.
      </p>
    </section>
  );
}
