"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { assignableRoles, ROLE_INFO, type Role } from "@/lib/auth/roles";
import type { TeamUser } from "@/lib/mock-data/users";
import styles from "@/styles/users/AddUserModal.module.css";

type Props = {
  currentRole: Role;
  existingEmails: string[];
  onClose: () => void;
  onAdd: (user: TeamUser) => void;
};

export default function AddUserModal({
  currentRole,
  existingEmails,
  onClose,
  onAdd,
}: Props) {
  const roles = assignableRoles(currentRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles[roles.length - 1] ?? "Staff");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim()) return setError("Enter the person's full name.");
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail))
      return setError("Enter a valid email address.");
    if (existingEmails.includes(cleanEmail))
      return setError("This email already has access to the account.");
    if (!roles.includes(role)) return setError("You can't assign that role.");

    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      email: cleanEmail,
      role,
      status: "Invited",
      lastActive: "Never",
    });
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
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
              They will get an email invite to join this account.
            </p>
          </div>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Full name</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Email address</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Role</span>
          <select
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
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
          <button type="button" className={styles.ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn}>
            Send invite
          </button>
        </div>
      </form>
    </div>
  );
}
