"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createOrganizationAction } from "@/lib/organization/actions";
import styles from "@/styles/users/CreateOrganizationDialog.module.css";

export default function CreateOrganizationDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createOrganizationAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="create-organization-title"
      onClose={onClose}
      onCancel={(event) => {
        if (pending || done) event.preventDefault();
      }}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <h2 id="create-organization-title">Create organization</h2>
            <p>You’ll own and can switch between multiple organizations.</p>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            disabled={pending || done}
          >
            <X size={16} aria-hidden />
          </button>
        </header>
        <form className={styles.form} onSubmit={submit}>
          <label>
            <span>Organization name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              required
              autoComplete="organization"
              autoFocus
              disabled={pending || done}
            />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <footer className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => dialogRef.current?.close()}
              disabled={pending || done}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submit} disabled={pending || done}>
              {done ? "Created…" : pending ? "Creating…" : "Create organization"}
            </button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
