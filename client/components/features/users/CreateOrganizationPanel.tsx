"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganizationAction } from "@/lib/organization/actions";
import styles from "@/styles/users/UsersPage.module.css";

export default function CreateOrganizationPanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createOrganizationAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form className={styles.createOrgPanel} onSubmit={submit}>
      <h2>Create an organization</h2>
      <p>
        Create your business space, then invite registered StockWise accounts to
        join it.
      </p>
      <label>
        Organization name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={160}
          required
          autoComplete="organization"
        />
      </label>
      {error && (
        <p role="alert" className={styles.createOrgError}>
          {error}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
