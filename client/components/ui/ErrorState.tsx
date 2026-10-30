"use client";

import styles from "@/styles/ui/ErrorState.module.css";

export default function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className={styles.box}>
      <h2 className={styles.title}>We couldn&apos;t load this page</h2>
      <p className={styles.text}>
        Check that the API server is running and the database is reachable, then
        try again.
      </p>
      <button type="button" onClick={onRetry} className={styles.button}>
        Try again
      </button>
    </div>
  );
}
