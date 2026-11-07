"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { Product } from "@/lib/inventory/types";
import type { PurchaseOrder } from "@/lib/api/orders";
import { formatPreferredCurrency } from "@/lib/utils/format";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
} from "@/lib/orders/actions";
import styles from "@/styles/orders/CreateOrderDialog.module.css";

type DraftItem = { productId: string; quantity: string; unitPrice: string };

export default function CreateOrderDialog({
  products,
  order,
  onClose,
}: {
  products: Product[];
  order?: PurchaseOrder;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<DraftItem[]>(
    order
      ? order.items.map((item) => ({
          productId: String(item.productId),
          quantity: String(item.quantityOrdered),
          unitPrice: String(item.unitPrice),
        }))
      : [{ productId: "", quantity: "", unitPrice: "" }],
  );
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { currency, currencyRates } = useUserPreferences();
  const orderTotal = items.reduce(
    (total, item) =>
      total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, []);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const payload = items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));
    startTransition(async () => {
      const result = order
        ? await updatePurchaseOrderAction(order.id, payload, notes)
        : await createPurchaseOrderAction(payload, notes);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="purchase-order-title"
      onClose={onClose}
    >
      <form className={styles.body} onSubmit={submit}>
        <header className={styles.header}>
          <div>
            <h2 id="purchase-order-title">
              {order ? `Edit order #${order.orderNumber}` : "Create purchase order"}
            </h2>
            <p>
              {order
                ? "Update products, quantities, or notes before receiving."
                : "Add the products and quantities you are ordering."}
            </p>
          </div>
        </header>

        <div className={styles.lines}>
          {items.map((item, index) => {
            const selectedIds = new Set(
              items
                .filter((_, itemIndex) => itemIndex !== index)
                .map((entry) => entry.productId)
                .filter(Boolean),
            );
            return (
              <div className={styles.line} key={index}>
                <label>
                  <span>Product</span>
                  <select
                    required
                    value={item.productId}
                    onChange={(event) =>
                      updateItem(index, {
                        productId: event.target.value,
                        unitPrice:
                          products.find(
                            (product) =>
                              String(product.id) === event.target.value,
                          )?.unitCost.toFixed(2) ?? "",
                      })
                    }
                  >
                    <option value="">Choose a product</option>
                    {products
                      .filter(
                        (product) =>
                          !selectedIds.has(String(product.id)) ||
                          item.productId === String(product.id),
                      )
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span>Quantity</span>
                  <input
                    required
                    type="number"
                    min="1"
                    max="2147483647"
                    step="1"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Unit value (USD)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    max="999999999999.99"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateItem(index, { unitPrice: event.target.value })
                    }
                  />
                </label>
                <span className={styles.lineTotal}>
                  {formatPreferredCurrency(
                    (Number(item.quantity) || 0) *
                      (Number(item.unitPrice) || 0),
                    currency,
                    currencyRates,
                  )}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeLine}
                    aria-label="Remove product"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className={styles.addLine}
            disabled={items.length >= Math.min(products.length, 100)}
            onClick={() =>
              setItems((current) => [
                ...current,
                { productId: "", quantity: "", unitPrice: "" },
              ])
            }
          >
            <Plus size={14} />
            Add another product
          </button>
        </div>

        <div className={styles.orderTotal}>
          <span>Order value (totals converted from USD)</span>
          <strong>
            {formatPreferredCurrency(orderTotal, currency, currencyRates)}
          </strong>
        </div>

        <label className={styles.notes}>
          <span>Notes (optional)</span>
          <textarea
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional order notes"
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
            className={styles.cancel}
            onClick={() => dialogRef.current?.close()}
            disabled={isPending}
          >
            Cancel
          </button>
          <button type="submit" className={styles.primary} disabled={isPending}>
            {isPending
              ? order
                ? "Saving…"
                : "Creating…"
              : order
                ? "Save changes"
                : "Create order"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
