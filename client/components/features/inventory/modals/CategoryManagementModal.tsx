"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { Category } from "@/lib/inventory/types";
import {
  createInventoryCategoryAction,
  deleteInventoryCategoryAction,
} from "@/lib/inventory/actions";
import styles from "@/styles/inventory/InventoryWorkflow.module.css";
import buttons from "@/styles/inventory/InventoryHeader.module.css";
import DestructiveConfirmationModal from "@/components/ui/DestructiveConfirmationModal";

export default function CategoryManagementModal({
  categories,
  onClose,
  onSuccess,
}: {
  categories: Category[];
  onClose: () => void;
  onSuccess: (deletedCategoryId?: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, []);

  function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createInventoryCategoryAction(categoryName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCategoryName("");
      onSuccess();
    });
  }

  function removeCategory(category: Category) {
    setCategoryToDelete(category);
  }

  function confirmRemoveCategory() {
    if (!categoryToDelete) return;
    setError("");
    startTransition(async () => {
      const result = await deleteInventoryCategoryAction(categoryToDelete.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCategoryToDelete(null);
      onSuccess(categoryToDelete.id);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="category-management-title"
      onClose={onClose}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <div>
            <h2 id="category-management-title" className={styles.title}>
              Manage categories
            </h2>
            <p className={styles.subtitle}>
              Add categories or remove ones your organization no longer uses.
            </p>
          </div>
        </header>

        <form className={styles.form} onSubmit={addCategory}>
          <label className={styles.field} htmlFor="inventory-category-name">
            Category name
            <input
              id="inventory-category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              maxLength={100}
              required
              autoFocus
            />
          </label>
          <div className={styles.actions}>
            <button
              type="submit"
              className={`${buttons.button} ${buttons.buttonPrimary}`}
              disabled={pending}
            >
              Add category
            </button>
          </div>
        </form>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <ul className={styles.categoryList}>
          {categories.map((category) => (
            <li key={category.id} className={styles.categoryRow}>
              <span>{category.name}</span>
              <button
                type="button"
                className={styles.categoryDelete}
                onClick={() => removeCategory(category)}
                disabled={pending}
                aria-label={`Remove ${category.name} category`}
              >
                <Trash2 size={14} aria-hidden />
                Remove
              </button>
            </li>
          ))}
          {categories.length === 0 && (
            <li className={styles.empty}>No categories yet.</li>
          )}
        </ul>

        <footer className={styles.actions}>
          <button
            type="button"
            className={buttons.button}
            onClick={() => dialogRef.current?.close()}
            disabled={pending}
          >
            Close
          </button>
        </footer>
      </div>
      {categoryToDelete && (
        <DestructiveConfirmationModal
          title="Remove category?"
          description={`Remove “${categoryToDelete.name}”? Products in this category will become uncategorized.`}
          confirmLabel="Remove"
          error={error}
          isPending={pending}
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={confirmRemoveCategory}
        />
      )}
    </dialog>
  );
}
