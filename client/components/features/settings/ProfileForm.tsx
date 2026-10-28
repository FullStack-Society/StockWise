"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import type { AccountSettings } from "@/lib/api/settings";
import { saveProfileSettings } from "@/lib/settings/actions";
import styles from "@/styles/settings/ProfileForm.module.css";

const TIMEZONES = [
  ["Asia/Manila", "Philippines (Asia/Manila)"],
  ["Asia/Singapore", "Singapore (Asia/Singapore)"],
  ["America/Los_Angeles", "Pacific Time (US)"],
  ["America/Chicago", "Central Time (US)"],
  ["America/New_York", "Eastern Time (US)"],
  ["Europe/London", "United Kingdom (Europe/London)"],
  ["Europe/Berlin", "Central Europe (Europe/Berlin)"],
  ["UTC", "UTC"],
];

export default function ProfileForm({
  settings,
  roleLabel,
}: {
  settings: AccountSettings;
  roleLabel: string;
}) {
  const [timezone, setTimezone] = useState(settings.timezone);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await saveProfileSettings({ timezone });
      setMessage(result.ok ? "Profile settings saved." : result.error);
    });
  }

  return (
    <form id="profile" className={styles.card} onSubmit={onSubmit}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Personal Profile</h2>
          <p className={styles.cardSub}>
            Your account identity and organization role are read-only.
          </p>
        </div>
        <button type="submit" className={styles.saveBtn} disabled={isPending}>
          <Save size={12} aria-hidden />{" "}
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Name</span>
          <input
            className={`${styles.input} ${styles.readOnly}`}
            value={settings.name}
            readOnly
            aria-readonly="true"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Email Address</span>
          <input
            className={`${styles.input} ${styles.readOnly}`}
            type="email"
            value={settings.email}
            readOnly
            aria-readonly="true"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Position</span>
          <input
            className={`${styles.input} ${styles.readOnly}`}
            value={roleLabel}
            readOnly
            aria-readonly="true"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Timezone</span>
          <select
            className={styles.input}
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {TIMEZONES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
