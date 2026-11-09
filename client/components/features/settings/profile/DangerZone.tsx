"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/lib/settings/actions";
import styles from "@/styles/settings/profile/DangerZone.module.css";
import DestructiveConfirmationModal from "@/components/ui/DestructiveConfirmationModal";

export default function DangerZone({
  ownedOrganizationNames,
}: {
  ownedOrganizationNames: string[];
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteMyAccount();
      if (!result.ok) setError(result.error);
      else setConfirmDelete(false);
    });
  }

  return (
    <section id="delete-account" className={styles.danger}>
      <div>
        <h2 className={styles.dangerTitle}>Delete Account</h2>
        <p className={styles.dangerText}>
          Your account will be deactivated and access removed. Historical
          records are retained.
          {ownedOrganizationNames.length > 0 && (
            <> Transfer ownership of or delete these organizations first: {ownedOrganizationNames.join(", ")}.</>
          )}
        </p>
      </div>
      <button
        type="button"
        className={styles.dangerBtn}
        onClick={() => setConfirmDelete(true)}
        disabled={pending || ownedOrganizationNames.length > 0}
      >
        {pending
          ? "Deleting…"
          : ownedOrganizationNames.length > 0
            ? "Transfer or delete owned organizations first"
            : "Delete Account"}
      </button>
      {error && (
        <p role="alert" className={styles.dangerError}>
          {error}
        </p>
      )}
      {confirmDelete && (
        <DestructiveConfirmationModal
          title="Delete account?"
          description="Deactivate your StockWise account? Your account and inventory history will be retained, but you will be signed out and lose organization access."
          confirmLabel="Delete account"
          isPending={pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={onDelete}
        />
      )}
    </section>
  );
}
