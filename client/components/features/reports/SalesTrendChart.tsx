import type { InventoryReportData } from "@/lib/api/reports";
import styles from "@/styles/reports/SalesTrendChart.module.css";

function linePath(values: number[], max: number) {
  if (!values.length) return "";
  const left = 44;
  const right = 580;
  const top = 18;
  const bottom = 178;
  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? (left + right) / 2
          : left + (index * (right - left)) / (values.length - 1);
      const y = bottom - (value / max) * (bottom - top);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export default function SalesTrendChart({
  report,
}: {
  report: InventoryReportData;
}) {
  const valuesIn = report.monthly_movement.map((item) => item.units_received);
  const valuesOut = report.monthly_movement.map((item) => item.units_issued);
  const maxValue = Math.max(1, ...valuesIn, ...valuesOut);
  const hasActivity =
    maxValue > 1 ||
    valuesIn.some((value) => value > 0) ||
    valuesOut.some((value) => value > 0);

  return (
    <section className={styles.chartPanel} aria-labelledby="movement-title">
      <div className={styles.panelHead}>
        <div>
          <h2 id="movement-title" className={styles.panelTitle}>
            Stock Movement
          </h2>
          <p className={styles.panelSub}>Units received and issued by month</p>
        </div>
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.lineSolid} /> Received
        </span>
        <span className={styles.legendItem}>
          <span className={styles.lineDotted} /> Issued
        </span>
      </div>
      {hasActivity ? (
        <svg
          className={styles.chart}
          viewBox="0 0 600 220"
          role="img"
          aria-label="Monthly stock received and issued"
        >
          {[0, 1, 2, 3].map((step) => {
            const y = 18 + step * 53;
            return (
              <line
                key={step}
                x1="44"
                x2="580"
                y1={y}
                y2={y}
                className={styles.gridLine}
              />
            );
          })}
          <path
            d={linePath(valuesIn, maxValue)}
            className={styles.receivedPath}
          />
          <path
            d={linePath(valuesOut, maxValue)}
            className={styles.issuedPath}
          />
          {report.monthly_movement.map((item, index) => {
            const x =
              report.monthly_movement.length === 1
                ? 312
                : 44 + (index * 536) / (report.monthly_movement.length - 1);
            const label = new Date(`${item.month}T00:00:00`).toLocaleDateString(
              undefined,
              { month: "short" },
            );
            return (
              <text
                key={item.month}
                x={x}
                y="208"
                textAnchor="middle"
                className={styles.axisText}
              >
                {label}
              </text>
            );
          })}
        </svg>
      ) : (
        <p className={styles.emptyChart}>
          No stock movements were recorded in this period.
        </p>
      )}
    </section>
  );
}
