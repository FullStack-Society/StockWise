"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PurchaseOrderHistoryEvent } from "@/lib/api/orders";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import { formatDateKey, formatDateTime } from "@/lib/utils/format";
import styles from "@/styles/orders/OrdersHistory.module.css";
import buttons from "@/styles/inventory/InventoryHeader.module.css";

const EVENT_LABEL: Record<PurchaseOrderHistoryEvent["eventType"], string> = {
  created: "Order created",
  updated: "Order edited",
  received: "Delivery received",
  deleted: "Order deleted",
};

function monthForTimezone(timezone: string) {
  return formatDateKey(new Date(), timezone).slice(0, 7);
}

export default function OrdersHistory({
  events,
  timezone,
  onClose,
}: {
  events: PurchaseOrderHistoryEvent[];
  timezone: string;
  onClose: () => void;
}) {
  const { date_format: dateFormat } = useUserPreferences();
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
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const timestamp = Date.parse(event.createdAt);
        if (Number.isNaN(timestamp)) return false;
        const eventDay = formatDateKey(new Date(timestamp), timezone);
        return eventDay.startsWith(month) && (!day || eventDay === day);
      }),
    [day, events, month, timezone],
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="orders-history-title"
      onClose={onClose}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <div>
            <h2 id="orders-history-title">Order history</h2>
            <p>Created, edited, received, and deleted orders for this organization.</p>
          </div>
        </header>
        <div className={styles.filters}>
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
              className={styles.clearDay}
              onClick={() => setDaySelection({ month, day: "" })}
            >
              Clear day
            </button>
          )}
          <span className={styles.count}>
            {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
          </span>
        </div>
        {filteredEvents.length === 0 ? (
          <p className={styles.empty}>No order activity for this date range.</p>
        ) : (
          <ol className={styles.list}>
            {filteredEvents.map((event) => (
              <li className={styles.item} key={event.id}>
                <div className={styles.event}>
                  <strong>Order #{event.orderNumber}</strong>
                  <span>{EVENT_LABEL[event.eventType]}</span>
                </div>
                <div className={styles.meta}>
                  <time dateTime={event.createdAt}>
                    {formatDateTime(event.createdAt, dateFormat, timezone)}
                  </time>
                  <span>{event.actorEmail}</span>
                </div>
                {event.eventType === "received" && (
                  <p className={styles.detail}>
                    Received {String(event.details.quantity_received ?? 0)} units
                    for {String(event.details.product_name ?? "a product")}.
                  </p>
                )}
                {(event.eventType === "created" || event.eventType === "updated") &&
                  Array.isArray(event.details.items) && (
                    <ul className={styles.orderItems}>
                      {event.details.items.slice(0, 8).map((rawItem, index) => {
                        const item =
                          typeof rawItem === "object" && rawItem !== null
                            ? (rawItem as Record<string, unknown>)
                            : {};
                        return (
                          <li key={`${String(item.product_id ?? index)}-${index}`}>
                            {String(item.product_name ?? item.sku ?? "Product")} × {String(item.quantity_ordered ?? 0)}
                          </li>
                        );
                      })}
                      {event.details.items.length > 8 && (
                        <li>And {event.details.items.length - 8} more products</li>
                      )}
                    </ul>
                  )}
                {event.eventType === "deleted" && (
                  <p className={styles.detail}>
                    This order was removed from the active list and retained in history.
                  </p>
                )}
              </li>
            ))}
          </ol>
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
