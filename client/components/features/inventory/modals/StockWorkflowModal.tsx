"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Product } from "@/lib/inventory/types";
import {
  adjustProductStockAction,
  recordProductStocktakeAction,
} from "@/lib/inventory/actions";
import buttons from "@/styles/inventory/InventoryHeader.module.css";
import styles from "@/styles/inventory/InventoryWorkflow.module.css";

export type StockMode = "OUT" | "ADJUST" | "STOCKTAKE";

type Props = {
  product: Product;
  mode: StockMode;
  onClose: () => void;
  onSuccess: () => void;
};

export default function StockWorkflowModal({
  product,
  mode,
  onClose,
  onSuccess,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const isStocktake = mode === "STOCKTAKE";
  const title =
    mode === "OUT"
      ? "Issue stock"
      : mode === "ADJUST"
        ? "Adjust stock"
        : "Record stock count";

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("quantity"));
    const reason = String(form.get("remarks") ?? "").trim();
    setError("");

    startTransition(async () => {
      const result =
        mode === "STOCKTAKE"
          ? await recordProductStocktakeAction(
              product.id,
              amount,
              reason,
            )
          : await adjustProductStockAction(
              product.id,
              mode,
              amount,
              reason,
            );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess();
      dialogRef.current?.close();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="stock-workflow-title"
      onClose={onClose}
      onCancel={(event) => {
        if (isPending) event.preventDefault();
      }}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <div>
            <h2 id="stock-workflow-title" className={styles.title}>
              {title}
            </h2>
            <p className={styles.subtitle}>
              {product.name} · {product.sku} · Current quantity:{" "}
              {product.quantity}
            </p>
          </div>
        </header>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            <span>
              {isStocktake
                ? "Physically counted quantity"
                : mode === "ADJUST"
                  ? "Change in quantity (+ or -)"
                  : "Quantity"}
            </span>
            <input
              autoFocus
              name="quantity"
              type="number"
              min={isStocktake ? 0 : mode === "ADJUST" ? undefined : 1}
              step="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{isStocktake ? "Count note" : "Reason"}</span>
            <textarea
              name="remarks"
              required
              maxLength={500}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder={
                isStocktake
                  ? "Describe the count or any discrepancy"
                  : mode === "ADJUST"
                    ? "e.g. Correcting a data-entry mistake"
                    : "e.g. Damaged goods"
              }
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <footer className={styles.actions}>
            <button
              type="button"
              className={buttons.button}
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${buttons.button} ${buttons.buttonPrimary}`}
              disabled={isPending}
            >
              {isPending ? "Saving…" : title}
            </button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
