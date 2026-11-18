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
  const [deleteConfirmation, setDeleteConfirmation] = useState<
    | { type: "single"; product: Product }
    | { type: "selected"; ids: number[] }
    | null
  >(null);
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

  function requestDeleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setError(null);
    setDeleteConfirmation({ type: "selected", ids });
  }

  function deleteSelected(ids: number[]) {
    setError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof deleteProductsAction>>;
      try {
        result = await deleteProductsAction(ids);
      } catch {
        setError("Unable to delete the selected products. Please try again.");
        setDeleteConfirmation(null);
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
      setDeleteConfirmation(null);
    });
  }

  function requestDeleteProduct(product: Product) {
    setError(null);
    setDeleteConfirmation({ type: "single", product });
  }

  function confirmDelete() {
    if (!deleteConfirmation) return;
    if (deleteConfirmation.type === "selected") {
      deleteSelected(deleteConfirmation.ids);
      return;
    }

    const product = deleteConfirmation.product;
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof deleteProductAction>>;
      try {
        result = await deleteProductAction(product.id);
      } catch {
        setError("Unable to delete this product. Please try again.");
        setDeleteConfirmation(null);
        return;
      }
      if (!result.ok) {
        setError(result.error);
        setDeleteConfirmation(null);
        return;
      }
      setSelected((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
      setDeleteConfirmation(null);
      router.refresh();
    });
  }

  return {
    selected,
    deleteConfirmation,
    error,
    isPending,
    clearError: () => setError(null),
    cancelDelete: () => setDeleteConfirmation(null),
    toggleOne,
    toggleAll,
    requestDeleteSelected,
    requestDeleteProduct,
    confirmDelete,
  };
}
