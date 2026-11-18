"use client";

import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import { useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { InventoryReportData } from "@/lib/api/reports";
import { formatPreferredCurrency } from "@/lib/utils/format";
import styles from "@/styles/reports/StockMovementChart.module.css";

import {
  axisLabel,
  bucketDate,
  bucketLabel,
  GROUP_LABELS,
  linePath,
  type GroupBy,
} from "./stock-movement-chart-utils";

export default function StockMovementChart({
  report,
}: {
  report: InventoryReportData;
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [verticalZoom, setVerticalZoom] = useState(0);
  const axisRangeScale = 1.25 ** verticalZoom;
  const chartHeight = 250;
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScroll: number } | null>(null);
  const { timezone, currency, currencyRates, date_format: dateFormat } =
    useUserPreferences();
  const movementSource =
    groupBy === "year"
      ? report.yearly_movement.map((movement) => ({
          day: `${movement.year}-01-01`,
          units_received: movement.units_received,
          units_issued: movement.units_issued,
          received_value: movement.received_value,
        }))
      : report.daily_movement;
  const buckets = new Map<
    string,
    { day: string; units_received: number; units_issued: number; received_value: number }
  >();
  for (const movement of movementSource) {
    const day = bucketDate(movement.day, groupBy);
    const bucket = buckets.get(day) ?? {
      day,
      units_received: 0,
      units_issued: 0,
      received_value: 0,
    };
    bucket.units_received += movement.units_received;
    bucket.units_issued += movement.units_issued;
    bucket.received_value += Number(movement.received_value);
    buckets.set(day, bucket);
  }
  const days = [...buckets.values()].sort((left, right) =>
    left.day.localeCompare(right.day),
  );
  const conversionRate =
    currency === "USD" ? 1 : (currencyRates?.[currency] ?? null);
  const valueSeriesAvailable = conversionRate !== null;
  const received = days.map((day) => day.units_received);
  const issued = days.map((day) => day.units_issued);
  const receivedValue = days.map((day) =>
    valueSeriesAvailable
      ? Number(day.received_value) * conversionRate
      : 0,
  );
  const maxUnits = Math.max(1, ...received, ...issued) * axisRangeScale;
  const maxValue = Math.max(1, ...receivedValue) * axisRangeScale;
  const hasActivity =
    received.some((value) => value > 0) ||
    issued.some((value) => value > 0) ||
    receivedValue.some((value) => value > 0);
  const dateStep =
    groupBy === "day"
      ? 30
      : groupBy === "week"
        ? 4
        : groupBy === "year"
          ? Math.max(1, Math.ceil(days.length / 12))
          : 1;
  const chartWidth = Math.min(
    8192,
    Math.max(1000, 112 + Math.max(0, days.length - 1) * 48),
  );
  const plot = {
    left: 24,
    right: chartWidth - 24,
    top: 28,
    bottom: 202,
  };
  useLayoutEffect(() => {
    const scroller = chartScrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth;
  }, [groupBy, chartWidth]);
  const currencyAxis = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <section className={styles.chartPanel} aria-labelledby="movement-title">
      <div className={styles.panelHead}>
        <div>
          <h2 id="movement-title" className={styles.panelTitle}>
            Stock Movement
          </h2>
          <p className={styles.panelSub}>
            {groupBy === "year"
              ? "Yearly totals · current year and prior movement history"
              : `${GROUP_LABELS[groupBy]} units received and issued, with estimated selling value · ${timezone}`}
          </p>
        </div>
        <div className={styles.headerControls}>
          <div className={styles.zoomControls} role="group" aria-label="Vertical chart zoom">
            <button
              type="button"
              onClick={() => setVerticalZoom((zoom) => Math.min(6, zoom + 1))}
              disabled={verticalZoom >= 6}
              aria-label="Zoom out to show higher values"
              title="Zoom out to show higher values"
            >
              <Plus size={14} />
            </button>
            <span aria-live="polite">{Math.round(axisRangeScale * 100)}%</span>
            <button
              type="button"
              onClick={() => setVerticalZoom((zoom) => Math.max(0, zoom - 1))}
              disabled={verticalZoom <= 0}
              aria-label="Zoom in vertically"
              title="Zoom in vertically"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setVerticalZoom(0)}
              disabled={verticalZoom === 0}
              aria-label="Reset chart zoom"
              title="Reset zoom"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.groupFilters} role="group" aria-label="Chart time grouping">
        {(["day", "week", "month", "year"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={groupBy === option ? styles.filterActive : styles.filter}
            aria-pressed={groupBy === option}
            onClick={() => {
              setGroupBy(option);
              setHoveredIndex(null);
            }}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.lineSolid} /> Received · units
        </span>
        <span className={styles.legendItem}>
          <span className={styles.lineDotted} /> Issued · units
        </span>
        <span className={styles.legendItem}>
          <span className={styles.valueLine} /> Received selling value · {currency}
        </span>
      </div>
      {hasActivity ? (
        <>
        <div className={styles.chartFrame}>
          <svg className={styles.fixedAxis} viewBox={`0 0 56 ${chartHeight}`} style={{ height: `${chartHeight}px` }} aria-hidden="true">
            {[0, 1, 2, 3].map((step) => {
              const y = plot.top + (step * (plot.bottom - plot.top)) / 3;
              const units = Math.round((maxUnits * (3 - step)) / 3);
              return (
                <text key={step} x="52" y={y + 3} textAnchor="end" className={styles.axisText}>
                  {units.toLocaleString()}
                </text>
              );
            })}
          </svg>
          <div
            className={styles.chartCanvas}
            ref={chartScrollRef}
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse" || event.button !== 0) return;
              dragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startScroll: event.currentTarget.scrollLeft,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              event.currentTarget.scrollLeft =
                drag.startScroll - (event.clientX - drag.startX);
              setHoveredIndex(null);
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
          <svg
            className={styles.chart}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: `${chartWidth}px`, height: `${chartHeight}px` }}
            role="img"
            aria-label={`${GROUP_LABELS[groupBy]} units received and issued, and value of stock received in ${currency}`}
            onMouseMove={(event) => {
              if (dragRef.current) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
              const ratio = (x - plot.left) / (plot.right - plot.left);
              setHoveredIndex(
                Math.max(0, Math.min(days.length - 1, Math.round(ratio * (days.length - 1)))),
              );
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {[0, 1, 2, 3].map((step) => {
              const y = plot.top + (step * (plot.bottom - plot.top)) / 3;
              return (
                <g key={step}>
                  <line
                    x1={plot.left}
                    x2={plot.right}
                    y1={y}
                    y2={y}
                    className={styles.gridLine}
                  />
                </g>
              );
            })}
            <path d={linePath(received, maxUnits, plot)} className={styles.receivedPath} />
            <path d={linePath(issued, maxUnits, plot)} className={styles.issuedPath} />
            {valueSeriesAvailable && (
              <path
                d={linePath(receivedValue, maxValue, plot)}
                className={styles.valuePath}
              />
            )}
            {days.map((day, index) => {
              const x =
                days.length === 1
                  ? (plot.left + plot.right) / 2
                  : plot.left +
                    (index * (plot.right - plot.left)) / (days.length - 1);
              const dateLabel = bucketLabel(day.day, groupBy, dateFormat);
              const showLabel = index % dateStep === 0 || index === days.length - 1;
              const receivedY =
                plot.bottom - (day.units_received / maxUnits) * (plot.bottom - plot.top);
              const issuedY =
                plot.bottom - (day.units_issued / maxUnits) * (plot.bottom - plot.top);
              const valueY =
                plot.bottom -
                (receivedValue[index] / maxValue) *
                  (plot.bottom - plot.top);
              return (
                <g key={day.day}>
                  <circle
                    cx={x}
                    cy={receivedY}
                    r={hoveredIndex === index ? "4" : "2.2"}
                    className={styles.receivedPoint}
                    tabIndex={0}
                    aria-label={`${dateLabel}: ${day.units_received} units received; ${day.units_issued} units issued; ${formatPreferredCurrency(receivedValue[index], currency, currencyRates)} estimated selling value`}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                  />
                  <circle
                    cx={x}
                    cy={issuedY}
                    r={hoveredIndex === index ? "4" : "2.2"}
                    className={styles.issuedPoint}
                    tabIndex={-1}
                  />
                  {valueSeriesAvailable && (
                    <circle
                      cx={x}
                      cy={valueY}
                      r={hoveredIndex === index ? "4" : "2.2"}
                      className={styles.valuePoint}
                      tabIndex={-1}
                    />
                  )}
                  {showLabel && (
                    <text
                      x={x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className={styles.axisText}
                    >
                      {axisLabel(day.day, groupBy, dateFormat)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          </div>
          <svg className={`${styles.fixedAxis} ${styles.fixedRightAxis}`} viewBox={`0 0 64 ${chartHeight}`} style={{ height: `${chartHeight}px` }} aria-hidden="true">
            {[0, 1, 2, 3].map((step) => {
              const y = plot.top + (step * (plot.bottom - plot.top)) / 3;
              const value = (maxValue * (3 - step)) / 3;
              return (
                <text key={step} x="4" y={y + 3} textAnchor="start" className={styles.axisText}>
                  {currencyAxis.format(value)}
                </text>
              );
            })}
          </svg>
        </div>
        {hoveredIndex !== null && days[hoveredIndex] && (
          <div className={styles.hoverDetails} aria-live="off">
              <strong>{bucketLabel(days[hoveredIndex].day, groupBy, dateFormat)}</strong>
              <span>Received: {days[hoveredIndex].units_received.toLocaleString()} units</span>
              <span>Issued: {days[hoveredIndex].units_issued.toLocaleString()} units</span>
              <span>
                Estimated selling value: {valueSeriesAvailable
                  ? formatPreferredCurrency(
                      receivedValue[hoveredIndex],
                      currency,
                      currencyRates,
                    )
                  : "Conversion unavailable"}
              </span>
          </div>
        )}
        </>
      ) : (
        <p className={styles.emptyChart}>
          No stock movements were recorded in this period.
        </p>
      )}
      <p className={styles.valueNote}>
        Received selling value is estimated using each product’s current selling price
        {conversionRate === null ? "; currency conversion is unavailable." : "."}
      </p>
    </section>
  );
}
