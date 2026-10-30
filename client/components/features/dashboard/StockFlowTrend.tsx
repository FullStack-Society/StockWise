"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/app/routes";
import type { DashboardStockFlow } from "@/lib/api/reports";
import { useUserPreferences } from "@/components/layout/UserPreferencesProvider";
import { formatDate } from "@/lib/utils/format";
import styles from "@/styles/dashboard/StockFlowTrend.module.css";

function chartCoordinates(values: number[], max: number) {
  const left = 32;
  const right = 470;
  const top = 18;
  const bottom = 154;
  return values.map((value, index) => {
    const x = left + (index * (right - left)) / Math.max(values.length - 1, 1);
    const y = bottom - (value / max) * (bottom - top);
    return { x, y };
  });
}

export default function StockFlowTrend({
  stockFlow,
  days,
}: {
  stockFlow: DashboardStockFlow;
  days: 7 | 14 | 30;
}) {
  const router = useRouter();
  const { date_format: dateFormat } = useUserPreferences();
  const received = stockFlow.days.map((day) => day.units_received);
  const max = Math.max(1, ...received);
  const points = chartCoordinates(received, max);
  const labelInterval = days === 7 ? 1 : days === 14 ? 2 : 5;
  const path = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");
  return (
    <section className={styles.panel} aria-labelledby="stock-flow-title">
      <div className={styles.panelHead}>
        <div>
          <h2 id="stock-flow-title" className={styles.title}>
            Stock Flow Trend
          </h2>
          <p className={styles.subtitle}>Units received each day</p>
        </div>
        <label className={styles.rangeLabel}>
          <span className={styles.visuallyHidden}>Stock flow date range</span>
          <select
            value={days}
            onChange={(event) => {
              const nextDays = Number(event.target.value);
              if (nextDays === 7 || nextDays === 14 || nextDays === 30) {
                router.push(`${ROUTES.dashboard}?days=${nextDays}`);
              }
            }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>
      </div>

      <div className={styles.chartWrap}>
        {received.some((value) => value > 0) ? (
          <svg
            className={styles.chart}
            viewBox="0 0 500 205"
            role="img"
            aria-label={`Units received into inventory each day over the last ${days} days`}
          >
            {[0, 1, 2, 3].map((step) => {
              const y = 18 + step * 45;
              const label = Math.round(max * (1 - step / 3));
              return (
                <g key={step}>
                  <line
                    x1="32"
                    x2="470"
                    y1={y}
                    y2={y}
                    className={styles.gridLine}
                  />
                  <text x="26" y={y + 3} textAnchor="end" className={styles.axis}>
                    {label}
                  </text>
                </g>
              );
            })}
            <path d={path} className={styles.trendLine} />
            {points.map(({ x, y }, index) => (
              <g key={stockFlow.days[index].day}>
                <circle cx={x} cy={y} r="4" className={styles.point} />
                <title>
                  {`${formatDate(stockFlow.days[index].day, dateFormat)}: ${received[index]} units received`}
                </title>
                {(index % labelInterval === 0 || index === points.length - 1) && (
                  <text
                    x={x}
                    y="179"
                    textAnchor="middle"
                    className={styles.axis}
                  >
                    {days === 7
                      ? new Date(`${stockFlow.days[index].day}T00:00:00Z`)
                          .toLocaleDateString("en-US", {
                            weekday: "short",
                            timeZone: "UTC",
                          })
                          .slice(0, 3)
                      : formatDate(stockFlow.days[index].day, dateFormat)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        ) : (
          <p className={styles.emptyChart}>
            No stock was added in the last {days} days.
          </p>
        )}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendLine} />
        <span>Incoming stock (units)</span>
      </div>

      <div className={styles.alertHead}>
        <h3>Urgent Alerts</h3>
        <span>{stockFlow.recent_receipts.length}</span>
      </div>
      <div className={styles.alertList}>
        {stockFlow.recent_receipts.length ? (
          stockFlow.recent_receipts.map((receipt, index) => (
            <Link
              className={styles.alert}
              href={`${ROUTES.inventory}?search=${encodeURIComponent(receipt.sku)}`}
              key={`${receipt.product_id}-${receipt.received_at}-${index}`}
            >
              <div className={styles.alertText}>
                <strong>{receipt.product_name}</strong>
                <span>
                  {receipt.quantity.toLocaleString()}{" "}
                  {receipt.quantity === 1 ? "unit" : "units"} added ·{" "}
                  {formatDate(receipt.received_at, dateFormat)}
                </span>
              </div>
              <span className={styles.receivedTag}>Received</span>
            </Link>
          ))
        ) : (
          <p className={styles.noAlerts}>
            No stock arrivals were recorded in the last {days} days.
          </p>
        )}
      </div>
      <Link href={ROUTES.inventory} className={styles.inventoryLink}>
        View inventory
      </Link>
    </section>
  );
}
