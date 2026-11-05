"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseOrderItem } from "@/lib/api/orders";
import { receivePurchaseOrderItemAction } from "@/lib/orders/actions";
import styles from "@/styles/orders/ReceiveOrderItem.module.css";

export default function ReceiveOrderItem({
  orderId,
  item,
}: {
  orderId: number;
  item: PurchaseOrderItem;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function receive(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await receivePurchaseOrderItemAction(
        orderId,
        item.id,
        Number(quantity),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuantity("");
      router.refresh();
    });
  }

  if (item.quantityRemaining === 0)
    return <span className={styles.completed}>Received</span>;

  return (
    <form className={styles.form} onSubmit={receive}>
      <input
        aria-label={`Quantity received for ${item.productName}`}
        type="number"
        min="1"
        max={item.quantityRemaining}
        step="1"
        required
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Receive"}
      </button>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
