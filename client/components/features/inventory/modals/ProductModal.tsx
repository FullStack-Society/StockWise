"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { saveProduct } from "@/lib/inventory/actions";
import type { Category, Product } from "@/lib/inventory/types";
import buttons from "@/styles/inventory/InventoryHeader.module.css";
import styles from "@/styles/inventory/InventoryActions.module.css";
import ProductFormFields from "./ProductFormFields";

type Props = {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
};

export default function ProductModal({ product, categories, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = product !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await saveProduct(formData);
      if (result.ok) {
        dialogRef.current?.close();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="product-modal-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className={styles.modalBody}>
        <header className={styles.modalHeader}>
          <div>
            <h2 id="product-modal-title" className={styles.modalTitle}>
              {isEdit ? "Edit product" : "Add product"}
            </h2>
            <p className={styles.modalSubtitle}>
              {isEdit
                ? "Update the product details."
                : "Create a new product in your inventory."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className={styles.closeButton}
          >
            <X size={14} />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <ProductFormFields
            product={product}
            categories={categories}
            errors={errors}
          />
          {formError && !Object.keys(errors).length && (
            <p role="alert" className={styles.formError}>
              {formError}
            </p>
          )}
          <footer className={styles.actions}>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
              className={buttons.button}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`${buttons.button} ${buttons.buttonPrimary}`}
            >
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
