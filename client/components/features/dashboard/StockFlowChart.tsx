import { Check, ChevronDown } from "lucide-react";
import {
  ALERTS,
  FLOW_DAYS,
  FLOW_INCOMING,
  FLOW_OUTGOING,
} from "@/lib/mock-data/dashboard";
import styles from "@/styles/dashboard/StockFlowChart.module.css";

// SVG chart geometry
const W = 360;
const H = 200;
const PAD = { left: 34, right: 12, top: 12, bottom: 24 };
const Y_MIN = 300;
const Y_MAX = 850;
const Y_TICKS = [400, 600, 800];

const x = (i: number) =>
  PAD.left + (i * (W - PAD.left - PAD.right)) / (FLOW_DAYS.length - 1);
const y = (v: number) =>
  PAD.top + ((Y_MAX - v) * (H - PAD.top - PAD.bottom)) / (Y_MAX - Y_MIN);

const toPoints = (values: number[]) =>
  values.map((v, i) => `${x(i)},${y(v)}`).join(" ");

export default function StockFlowChart() {
  return (
    <section className={styles.chartPanel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Stock Flow Trend</h2>
        <ChevronDown size={16} />
      </div>

      <div className={styles.chart}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Incoming and outgoing stock this week"
        >
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line
                className={styles.gridLine}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
              />
              <text
                className={styles.axisText}
                x={PAD.left - 8}
                y={y(t) + 3}
                textAnchor="end"
              >
                {t}
              </text>
            </g>
          ))}

          {FLOW_DAYS.map((d, i) => (
            <g key={d}>
              <line
                className={styles.gridLine}
                x1={x(i)}
                x2={x(i)}
                y1={PAD.top}
                y2={H - PAD.bottom}
              />
              <text
                className={styles.axisText}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
              >
                {d}
              </text>
            </g>
          ))}

          <polyline
            className={styles.lineOut}
            points={toPoints(FLOW_OUTGOING)}
          />
          <polyline
            className={styles.lineIn}
            points={toPoints(FLOW_INCOMING)}
          />

          {FLOW_OUTGOING.map((v, i) => (
            <circle key={`o${i}`} cx={x(i)} cy={y(v)} r={1.8} fill="#fff" />
          ))}
          {FLOW_INCOMING.map((v, i) => (
            <circle key={`i${i}`} cx={x(i)} cy={y(v)} r={2.5} fill="#fff" />
          ))}
        </svg>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDash} /> Incoming
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} /> Outgoing
          </span>
        </div>
      </div>

      <div className={styles.alerts}>
        <h3 className={styles.alertsTitle}>Urgent alerts</h3>
        <ul className={styles.alertList}>
          {ALERTS.map((a) => (
            <li
              key={a.text}
              className={`${styles.alert} ${a.tone === "warning" ? styles.alertWarning : ""}`}
            >
              <Check size={12} />
              {a.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
