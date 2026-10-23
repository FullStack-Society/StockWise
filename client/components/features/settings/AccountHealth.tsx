import { ShieldAlert } from "lucide-react";
import { accountHealth } from "@/lib/mock-data/settings";
import styles from "@/styles/settings/AccountHealth.module.css";

export default function AccountHealth() {
  return (
    <section className={styles.healthCard}>
      <div className={styles.healthHead}>
        <ShieldAlert size={14} aria-hidden />
        <span>Account Health</span>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuenow={accountHealth.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${accountHealth.percent}%` }}
        />
      </div>
      <p className={styles.healthHint}>
        {accountHealth.percent}% Complete &middot; {accountHealth.hint}
      </p>
    </section>
  );
}
