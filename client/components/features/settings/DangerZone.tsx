"use client";

import styles from "@/styles/settings/DangerZone.module.css";

export default function DangerZone() {
  function onDelete() {
    if (!window.confirm("Delete your account? This cannot be undone.")) return;
    // Placeholder: replace with a Server Action that deletes the user and calls logout().
    console.log("delete account");
  }

  return (
    <section className={styles.danger}>
      <div>
        <h2 className={styles.dangerTitle}>Delete Account</h2>
        <p className={styles.dangerText}>
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
      </div>
      <button type="button" className={styles.dangerBtn} onClick={onDelete}>
        Delete Account
      </button>
    </section>
  );
}
