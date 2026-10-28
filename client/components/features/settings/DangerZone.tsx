"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/lib/settings/actions";
import styles from "@/styles/settings/DangerZone.module.css";

export default function DangerZone({ isOwner }: { isOwner: boolean }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !window.confirm(
        "Deactivate your StockWise account? Your account and inventory history will be retained, but you will be signed out and lose organization access.",
      )
    )
      return;
    setError("");
    startTransition(async () => {
      const result = await deleteMyAccount();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className={styles.danger}>
      <div>
        <h2 className={styles.dangerTitle}>Delete Account</h2>
        <p className={styles.dangerText}>
          Your account will be deactivated and access removed. Historical
          records are retained.
          {isOwner &&
            " Transfer ownership and leave every organization before deleting your owner account."}
        </p>
      </div>
      <button
        type="button"
        className={styles.dangerBtn}
        onClick={onDelete}
        disabled={pending}
      >
        {pending ? "Deleting…" : "Delete Account"}
      </button>
      {error && (
        <p role="alert" className={styles.dangerError}>
          {error}
        </p>
      )}
    </section>
  );
}
