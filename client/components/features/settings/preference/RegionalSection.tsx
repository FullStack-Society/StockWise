"use client";

import { ChevronDown } from "lucide-react";
import { TIMEZONES } from "./types";
import styles from "@/styles/settings/PreferencesPanel.module.css";

export default function RegionalSection({
  timezone,
  message,
  pending,
  resetting,
  onTimezoneChange,
  onSave,
  onReset,
}: {
  timezone: string;
  message: string;
  pending: boolean;
  resetting: boolean;
  onTimezoneChange: (timezone: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <section className={styles.card} aria-labelledby="regional-title">
      <h2 id="regional-title" className={styles.cardTitle}>
        Regional
      </h2>
      <p className={styles.cardSub}>
        Set your time zone and calendar preferences.
      </p>
      <div className={styles.regionalGrid}>
        <label className={styles.field}>
          <span className={styles.sectionLabel}>Timezone</span>
          <select
            className={styles.input}
            value={timezone}
            onChange={(event) => onTimezoneChange(event.target.value)}
          >
            {TIMEZONES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.sectionLabel}>First day of week</span>
          <span className={styles.selectWrap}>
            <select className={styles.input} defaultValue="monday" disabled>
              <option value="monday">Monday</option>
            </select>
            <ChevronDown size={12} aria-hidden />
          </span>
        </label>
      </div>
      <div className={styles.panelFooter}>
        {message && (
          <p className={styles.message} role="status">
            {message}
          </p>
        )}
        <button
          type="button"
          className={styles.saveButton}
          onClick={onSave}
          disabled={pending || resetting}
        >
          {pending ? "Saving…" : "Save timezone"}
        </button>
        <button
          type="button"
          className={styles.resetButton}
          onClick={onReset}
          disabled={pending || resetting}
        >
          {resetting ? "Resetting…" : "Reset to defaults"}
        </button>
      </div>
    </section>
  );
}
