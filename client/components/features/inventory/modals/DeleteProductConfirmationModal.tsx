"use client";

import DestructiveConfirmationModal from "@/components/ui/DestructiveConfirmationModal";
import type { Product } from "@/lib/inventory/types";

type Props = {
  product: Product | null;
  selectedCount: number;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteProductConfirmationModal({
  product,
  selectedCount,
  isPending,
  onCancel,
  onConfirm,
}: Props) {
  const isBulk = product === null;
  return (
    <DestructiveConfirmationModal
      title={isBulk ? "Delete selected products?" : "Delete product?"}
      description={
        isBulk
          ? `Mark ${selectedCount} selected ${selectedCount === 1 ? "product" : "products"} as deleted? They will be hidden from active inventory.`
          : `Mark "${product.name}" as deleted? It will be hidden from active inventory.`
      }
      confirmLabel={isPending ? "Deleting…" : "Delete"}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
