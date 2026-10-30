"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { renameOrganizationAction } from "@/lib/organization/actions";
import styles from "@/styles/settings/ProfileForm.module.css";

export default function OrganizationPanel({
  organizationId,
  organizationName,
}: {
  organizationId: number;
  organizationName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(organizationName);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await renameOrganizationAction(name);
      setMessage(result.ok ? "Organization name saved." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <form className={styles.card} onSubmit={onSubmit}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Organization</h2>
          <p className={styles.cardSub}>
            Update the name members see throughout StockWise.
          </p>
        </div>
        <button type="submit" className={styles.saveBtn} disabled={isPending}>
          <Save size={12} aria-hidden />{" "}
          {isPending ? "Saving…" : "Save Name"}
        </button>
      </div>
      <div className={styles.fieldGrid}>
        <label className={`${styles.field} ${styles.fullRow}`}>
          <span className={styles.fieldLabel}>Organization name</span>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={1}
            maxLength={160}
            required
            autoComplete="organization"
            aria-label={`Organization name for organization ${organizationId}`}
          />
        </label>
      </div>
      {message && (
        <p className={styles.formMessage} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
