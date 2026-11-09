"use client";

import { useEffect, useState } from "react";
import { assignableRoles, ROLE_INFO, type Role } from "@/lib/auth/roles";
import styles from "@/styles/users/AddUserModal.module.css";

type Props = {
  currentRole: Role;
  existingEmails: string[];
  onClose: () => void;
  onInvite: (email: string, role: Exclude<Role, "owner">) => Promise<void>;
};

export default function AddUserModal({
  currentRole,
  existingEmails,
  onClose,
  onInvite,
}: Props) {
  const roles = assignableRoles(currentRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>(
    (roles[roles.length - 1] as Exclude<Role, "owner">) ?? "staff",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (!saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail))
      return setError("Enter a valid email address.");
    if (existingEmails.includes(cleanEmail))
      return setError(
        "This email already belongs to a member or has a pending invite.",
      );
    if (!roles.includes(role)) return setError("You can't assign that role.");

    setSaving(true);
    setError("");
    try {
      await onInvite(cleanEmail, role);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to send the invitation.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
    >
      <form
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-title"
        onSubmit={submit}
      >
        <div className={styles.modalHead}>
          <div>
            <h2 id="add-user-title" className={styles.modalTitle}>
              Add User
            </h2>
            <p className={styles.modalSub}>
              Invite by email, even if they haven’t signed up yet. They’ll see
              the invitation in StockWise after registering with this email.
            </p>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Email address</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Role</span>
          <select
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value as Exclude<Role, "owner">)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className={styles.roleHint}>{ROLE_INFO[role].summary}</span>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>
            {saving ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </form>
    </div>
  );
}
