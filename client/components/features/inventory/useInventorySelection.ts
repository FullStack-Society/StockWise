"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProductAction,
  deleteProductsAction,
} from "@/lib/inventory/actions";
import type { Product } from "@/lib/inventory/types";

export function useInventorySelection() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleOne(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(productIds: number[]) {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected =
        productIds.length > 0 && productIds.every((id) => next.has(id));
      productIds.forEach((id) =>
        allSelected ? next.delete(id) : next.add(id),
      );
      return next;
    });
  }

  function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Mark ${ids.length} selected ${ids.length === 1 ? "product" : "products"} as deleted? They will be hidden from active inventory.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof deleteProductsAction>>;
      try {
        result = await deleteProductsAction(ids);
      } catch {
        setError("Unable to delete the selected products. Please try again.");
        return;
      }
      setSelected((current) => {
        const next = new Set(current);
        result.deletedIds.forEach((id) => next.delete(id));
        return next;
      });

      if (result.failures.length > 0) {
        const failedCount = result.failures.length;
        const deletedCount = result.deletedIds.length;
        setError(
          deletedCount > 0
            ? `${deletedCount} deleted; ${failedCount} could not be deleted. The failed products remain selected.`
            : `Unable to delete the selected products: ${result.failures.map((failure) => failure.error).join("; ")}`,
        );
      }

      if (result.deletedIds.length > 0) router.refresh();
    });
  }

  function deleteProduct(product: Product) {
    if (
      !window.confirm(
        `Mark "${product.name}" as deleted? It will be hidden from active inventory.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof deleteProductAction>>;
      try {
        result = await deleteProductAction(product.id);
      } catch {
        setError("Unable to delete this product. Please try again.");
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
    });
  }

  return {
    selected,
    error,
    isPending,
    clearError: () => setError(null),
    toggleOne,
    toggleAll,
    deleteSelected,
    deleteProduct,
  };
}
