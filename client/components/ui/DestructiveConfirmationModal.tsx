"use client";

import { useEffect, useId, useRef } from "react";
import { Trash2 } from "lucide-react";
import buttons from "@/styles/inventory/InventoryHeader.module.css";
import styles from "@/styles/inventory/InventoryActions.module.css";

export default function DestructiveConfirmationModal({
  title,
  description,
  confirmLabel = "Delete",
  error,
  isPending,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  error?: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby={titleId}
      onClose={onCancel}
    >
      <div className={styles.modalBody}>
        <header className={styles.modalHeader}>
          <div>
            <h2 id={titleId} className={styles.modalTitle}>
              {title}
            </h2>
            <p className={styles.modalSubtitle}>{description}</p>
          </div>
        </header>
        {error && <p role="alert" className={styles.modalError}>{error}</p>}
        <footer className={styles.confirmActions}>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={isPending}
            className={buttons.button}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={styles.confirmDeleteButton}
          >
            <Trash2 size={14} aria-hidden />
            {isPending ? "Working…" : confirmLabel}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
