"use client";

import { useState } from "react";
import { preferenceItems } from "@/lib/mock-data/settings";
import styles from "@/styles/settings/PreferencesPanel.module.css";

export default function PreferencesPanel() {
  const [items, setItems] = useState(preferenceItems);

  function toggle(id: string) {
    setItems((list) =>
      list.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  }

  return (
    <section id="preferences-security" className={styles.card}>
      <h2 className={styles.cardTitle}>Preferences &amp; Security</h2>

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
              onClick={() => toggle(p.id)}
            >
              <span className={styles.knob} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
