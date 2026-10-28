"use client";

import { useState, useTransition } from "react";
import type { AccountSettings } from "@/lib/api/settings";
import { savePreferences } from "@/lib/settings/actions";
import styles from "@/styles/settings/PreferencesPanel.module.css";

export default function PreferencesPanel({
  settings,
}: {
  settings: AccountSettings;
}) {
  const [invitationNotifications, setInvitationNotifications] = useState(
    settings.invitation_notifications,
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !invitationNotifications;
    setInvitationNotifications(next);
    setMessage("");
    startTransition(async () => {
      const result = await savePreferences({ invitation_notifications: next });
      if (!result.ok) {
        setInvitationNotifications(!next);
      }
      setMessage(result.ok ? "Preference saved." : result.error);
    });
  }

  const items = [
    {
      id: "invitation_notifications" as const,
      title: "Invitation notifications",
      description: "Show organization invitations in your notification area.",
      enabled: invitationNotifications,
    },
  ];

  return (
    <section id="preferences" className={styles.card}>
      <h2 className={styles.cardTitle}>Preferences</h2>
      <p className={styles.cardSub}>Choose how StockWise keeps you informed.</p>

      <ul className={styles.prefList}>
        {items.map((p) => (
          <li key={p.id} className={styles.prefRow}>
            <div>
              <div className={styles.prefTitle}>{p.title}</div>
              <div className={styles.prefDesc}>{p.description}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={p.enabled}
              aria-label={p.title}
              className={`${styles.switch} ${p.enabled ? styles.switchOn : ""}`}
              disabled={isPending}
              onClick={toggle}
            >
              <span className={styles.knob} />
            </button>
          </li>
        ))}
      </ul>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
