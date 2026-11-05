"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { InventoryMovement } from "@/lib/inventory/types";
import styles from "@/styles/inventory/InventoryWorkflow.module.css";

function activityLabel(movement: InventoryMovement): string {
  switch (movement.type) {
    case "TRANSFER_IN":
      return "Transfer in";
    case "TRANSFER_OUT":
      return "Transfer out";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.modal} ${styles.historyModal}`}
      aria-labelledby="inventory-history-title"
      onClose={onClose}
      onClick={(event) =>
        event.target === event.currentTarget && dialogRef.current?.close()
      }
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <div>
            <h2 id="inventory-history-title" className={styles.title}>
              Stock history
            </h2>
            <p className={styles.subtitle}>
              Recent receipts, issues, and stock counts for your business.
            </p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={15} />
          </button>
        </header>
        {movements.length === 0 ? (
          <p className={styles.empty}>No stock activity has been recorded.</p>
        ) : (
          <div className={styles.historyWrap}>
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
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.occurredAt).toLocaleString()}</td>
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
      </div>
    </dialog>
  );
}
