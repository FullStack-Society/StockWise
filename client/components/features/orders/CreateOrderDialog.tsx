"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { Product } from "@/lib/inventory/types";
import { createPurchaseOrderAction } from "@/lib/orders/actions";
import styles from "@/styles/orders/CreateOrderDialog.module.css";

type DraftItem = { productId: string; quantity: string };

export default function CreateOrderDialog({
  products,
  onClose,
}: {
  products: Product[];
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<DraftItem[]>([
    { productId: "", quantity: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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
    }));
    startTransition(async () => {
      const result = await createPurchaseOrderAction(payload, notes);
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
      aria-labelledby="create-order-title"
      onClose={onClose}
      onClick={(event) =>
        event.target === event.currentTarget && dialogRef.current?.close()
      }
    >
      <form className={styles.body} onSubmit={submit}>
        <header className={styles.header}>
          <div>
            <h2 id="create-order-title">Create purchase order</h2>
            <p>Add the products and quantities you are ordering.</p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={16} />
          </button>
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
                      updateItem(index, { productId: event.target.value })
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
                  <span>Quantity ordered</span>
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
                { productId: "", quantity: "" },
              ])
            }
          >
            <Plus size={14} />
            Add another product
          </button>
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
            {isPending ? "Creating…" : "Create order"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
