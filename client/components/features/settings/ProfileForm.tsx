"use client";

import { useState } from "react";
import { Save, Mail } from "lucide-react";
import { profileDefaults, TIMEZONES } from "@/lib/mock-data/settings";
import styles from "@/styles/settings/ProfileForm.module.css";

type Props = { firstName: string; lastName: string; email: string };

export default function ProfileForm({ firstName, lastName, email }: Props) {
  const [form, setForm] = useState({
    firstName,
    lastName,
    email,
    position: profileDefaults.position,
    timezone: profileDefaults.timezone,
  });
  const [saved, setSaved] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Placeholder: replace with a Server Action that updates the user record.
    console.log("save profile", form);
    setSaved(true);
  }

  return (
    <form id="profile" className={styles.card} onSubmit={onSubmit}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Personal Profile</h2>
          <p className={styles.cardSub}>
            Update your personal details and how others see you.
          </p>
        </div>
        <button type="submit" className={styles.saveBtn}>
          <Save size={12} aria-hidden /> {saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>First Name</span>
          <input
            className={styles.input}
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Last Name</span>
          <input
            className={styles.input}
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </label>

        <label className={`${styles.field} ${styles.fullRow}`}>
          <span className={styles.fieldLabel}>Email Address</span>
          <span className={styles.inputWrap}>
            <input
              className={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
            <Mail size={14} className={styles.inputIcon} aria-hidden />
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Position</span>
          <input
            className={styles.input}
            value={form.position}
            onChange={(e) => update("position", e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Timezone</span>
          <select
            className={styles.input}
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}
