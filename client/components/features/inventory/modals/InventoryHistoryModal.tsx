"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InventoryMovement } from "@/lib/inventory/types";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import { formatDateKey, formatDateTime } from "@/lib/utils/format";
import styles from "@/styles/inventory/InventoryWorkflow.module.css";
import buttons from "@/styles/inventory/InventoryHeader.module.css";

function monthForTimezone(timezone: string) {
  return formatDateKey(new Date(), timezone).slice(0, 7);
}

function activityLabel(movement: InventoryMovement): string {
  switch (movement.type) {
    case "IN":
      return movement.remarks?.startsWith("Adjustment:")
        ? "Adjusted in"
        : "Received";
    case "OUT":
      return movement.remarks?.startsWith("Adjustment:")
        ? "Adjusted out"
        : "Issued";
    case "STOCKTAKE":
      return "Stocktake";
    default:
      return "Other";
  }
}

export default function InventoryHistoryModal({
  movements,
  onClose,
}: {
  movements: InventoryMovement[];
  onClose: () => void;
}) {
  const { date_format: dateFormat, timezone } = useUserPreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() =>
    monthForTimezone(timezone),
  );
  const [monthSelection, setMonthSelection] = useState(() => {
    const month = monthForTimezone(timezone);
    return { month, currentMonth: month };
  });
  const month =
    monthSelection.currentMonth === currentMonth
      ? monthSelection.month
      : currentMonth;
  const [daySelection, setDaySelection] = useState({ month: "", day: "" });
  const day = daySelection.month === month ? daySelection.day : "";

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, []);

  useEffect(() => {
    const updateCurrentMonth = () =>
      setCurrentMonth(monthForTimezone(timezone));
    const timer = setInterval(updateCurrentMonth, 60_000);
    return () => clearInterval(timer);
  }, [timezone]);

  const lastDay = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const firstDate = `${month}-01`;
  const lastDate = `${month}-${String(lastDay).padStart(2, "0")}`;
  const filteredMovements = useMemo(
    () =>
      movements.filter((movement) => {
        const movementDay = formatDateKey(movement.occurredAt, timezone);
        return movementDay.startsWith(month) && (!day || movementDay === day);
      }),
    [day, month, movements, timezone],
  );
  const historyMayBeTruncated = movements.length >= 200;

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.modal} ${styles.historyModal}`}
      aria-labelledby="inventory-history-title"
      onClose={onClose}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <div>
            <h2 id="inventory-history-title" className={styles.title}>
              Stock history
            </h2>
            <p className={styles.subtitle}>
              Receipts, issues, and stock counts for the selected month or day.
            </p>
          </div>
        </header>
        <div className={styles.historyFilters}>
          <label>
            <span>Month</span>
            <input
              type="month"
              value={month}
              max={currentMonth}
              onChange={(event) => {
                setMonthSelection({
                  month: event.target.value || currentMonth,
                  currentMonth,
                });
              }}
            />
          </label>
          <label>
            <span>Day (optional)</span>
            <input
              type="date"
              value={day}
              min={firstDate}
              max={lastDate}
              onChange={(event) =>
                setDaySelection({ month, day: event.target.value })
              }
            />
          </label>
          {day && (
            <button
              type="button"
              className={styles.historyClearDay}
              onClick={() => setDaySelection({ month, day: "" })}
            >
              Clear day
            </button>
          )}
          <span className={styles.historyCount}>
            {filteredMovements.length}{" "}
            {filteredMovements.length === 1 ? "event" : "events"}
          </span>
        </div>
        {historyMayBeTruncated && (
          <p className={styles.historyLimitNotice} role="status">
            Showing the latest 200 stock movements. Older activity may not appear in this history view.
          </p>
        )}
        {filteredMovements.length === 0 ? (
          <p className={styles.empty}>
            {historyMayBeTruncated
              ? "No stock activity for this date range in the latest 200 movements. Older activity may be available outside this view."
              : "No stock activity for this date range."}
          </p>
        ) : (
          <div className={`${styles.historyWrap} mobileTableScroll`}>
            <table className={styles.history}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Activity</th>
                  <th>Qty</th>
                  <th>By</th>
                  <th>Reason / note</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      {formatDateTime(
                        movement.occurredAt,
                        dateFormat,
                        timezone,
                      )}
                    </td>
                    <td>
                      {movement.productName}
                      <small>{movement.sku}</small>
                    </td>
                    <td>{activityLabel(movement)}</td>
                    <td>
                      {movement.type === "STOCKTAKE" &&
                      movement.countedQuantity !== null
                        ? `${movement.countedQuantity} counted`
                        : movement.quantity}
                      {movement.type === "STOCKTAKE" &&
                        movement.expectedQuantity !== null && (
                          <small>Expected {movement.expectedQuantity}</small>
                        )}
                    </td>
                    <td>{movement.actorEmail}</td>
                    <td>{movement.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className={styles.actions}>
          <button
            type="button"
            className={buttons.button}
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </button>
        </footer>
      </div>
    </dialog>
  );
}
