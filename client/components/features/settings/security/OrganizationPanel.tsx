"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, ShieldAlert, UserRoundCog, X } from "lucide-react";
import {
  deleteOrganizationAction,
  renameOrganizationAction,
  transferOrganizationOwnershipAction,
} from "@/lib/organization/actions";
import styles from "@/styles/settings/security/OrganizationPanel.module.css";
import DestructiveConfirmationModal from "@/components/ui/DestructiveConfirmationModal";

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
  const [targetEmail, setTargetEmail] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [namePending, startNameTransition] = useTransition();
  const [transferPending, startTransferTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startNameTransition(async () => {
      const result = await renameOrganizationAction(name);
      setMessage(result.ok ? "Organization name saved." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
    <form id="organization-settings-title" className={styles.card} onSubmit={onSubmit}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Organization</h2>
          <p className={styles.cardSub}>
            Update the name members see throughout StockWise.
          </p>
        </div>
        <button type="submit" className={styles.saveBtn} disabled={namePending}>
          <Save size={12} aria-hidden />{" "}
          {namePending ? "Saving…" : "Save Name"}
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
    <section className={`${styles.card} ${styles.ownerActions}`} aria-labelledby="transfer-ownership-title">
      <div className={styles.cardHead}>
        <div>
          <h2 id="transfer-ownership-title" className={styles.cardTitle}>Transfer ownership</h2>
          <p className={styles.cardSub}>Choose an active member. You will become a manager.</p>
        </div>
      </div>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>New owner’s email</span>
        <input
          className={styles.input}
          type="email"
          value={targetEmail}
          onChange={(event) => setTargetEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <button
        type="button"
        className={styles.saveBtn}
        disabled={transferPending || deletePending || !targetEmail.trim()}
        onClick={() => {
          if (!window.confirm(`Transfer ownership of “${organizationName}” to ${targetEmail.trim()}? You will become a manager.`)) return;
          setTransferMessage("");
          startTransferTransition(async () => {
            const result = await transferOrganizationOwnershipAction(organizationId, targetEmail);
            setTransferMessage(result.ok ? "Ownership transferred. You are now a manager." : result.error);
            if (result.ok) router.refresh();
          });
        }}
      >
        <UserRoundCog size={13} aria-hidden /> {transferPending ? "Transferring…" : "Transfer ownership"}
      </button>
      {transferMessage && <p className={styles.formMessage} role="status">{transferMessage}</p>}
    </section>
    <section className={`${styles.card} ${styles.deleteCard}`} aria-labelledby="delete-organization-title">
      <div className={styles.cardHead}>
        <div>
          <h2 id="delete-organization-title" className={styles.cardTitle}>Delete organization</h2>
          <p className={styles.cardSub}>Permanently delete this organization and its inventory, stock history, and purchase orders.</p>
        </div>
      </div>
      <button
        type="button"
        className={styles.deleteBtn}
        disabled={deletePending || transferPending || namePending}
        onClick={() => setConfirmDelete(true)}
      >
        <X size={13} aria-hidden /> {deletePending ? "Deleting…" : "Delete organization and its data"}
      </button>
      {deleteMessage && <p className={styles.formMessage} role="alert"><ShieldAlert size={13} aria-hidden /> {deleteMessage}</p>}
    </section>
    {confirmDelete && (
      <DestructiveConfirmationModal
        title="Delete organization?"
        description={`Permanently delete “${organizationName}” and its inventory, stock history, members, and purchase orders? This cannot be undone.`}
        confirmLabel="Delete organization"
        isPending={deletePending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setDeleteMessage("");
          startDeleteTransition(async () => {
            const result = await deleteOrganizationAction(organizationId);
            setDeleteMessage(result.ok ? "Organization deleted." : result.error);
            setConfirmDelete(false);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      />
    )}
    </div>
  );
}
