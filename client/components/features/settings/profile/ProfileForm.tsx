"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Search } from "lucide-react";
import type { AccountSettings } from "@/lib/api/settings";
import { saveProfileSettings } from "@/lib/settings/actions";
import styles from "@/styles/settings/profile/ProfileForm.module.css";

export default function ProfileForm({
  settings,
  roleLabel,
  ownedOrganizationCount,
}: {
  settings: AccountSettings;
  roleLabel: string;
  ownedOrganizationCount: number;
}) {
  const router = useRouter();
  const [firstName = "", ...initialLastNameParts] = settings.name
    .trim()
    .split(/\s+/);
  const [firstNameValue, setFirstNameValue] = useState(firstName);
  const [lastNameValue, setLastNameValue] = useState(
    initialLastNameParts.join(" "),
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const name = [firstNameValue.trim(), lastNameValue.trim()]
      .filter(Boolean)
      .join(" ");
    startTransition(async () => {
      const result = await saveProfileSettings({
        name,
        timezone: settings.timezone,
      });
      setMessage(result.ok ? "Profile settings saved." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <form id="profile" className={styles.card} onSubmit={onSubmit}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Personal Profile</h2>
          <p className={styles.cardSub}>
            Review and update your profile details.
          </p>
        </div>
        <button type="submit" className={styles.saveBtn} disabled={isPending}>
          <Save size={12} aria-hidden />{" "}
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>First Name</span>
          <input
            className={styles.input}
            value={firstNameValue}
            onChange={(event) => setFirstNameValue(event.target.value)}
            maxLength={160}
            autoComplete="given-name"
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Last Name</span>
          <input
            className={styles.input}
            value={lastNameValue}
            onChange={(event) => setLastNameValue(event.target.value)}
            maxLength={160}
            autoComplete="family-name"
          />
        </label>
        <label className={`${styles.field} ${styles.fullRow}`}>
          <span className={styles.fieldLabel}>Email Address</span>
          <span className={styles.inputWrap}>
            <input
              className={`${styles.input} ${styles.withIcon}`}
              type="email"
              value={settings.email}
              readOnly
              aria-readonly="true"
            />
            <Search size={13} className={styles.inputIcon} aria-hidden />
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Position</span>
          <input
            className={styles.input}
            value={roleLabel}
            readOnly
            aria-readonly="true"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Organizations owned</span>
          <input
            className={styles.input}
            value={ownedOrganizationCount.toLocaleString()}
            readOnly
            aria-readonly="true"
          />
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
