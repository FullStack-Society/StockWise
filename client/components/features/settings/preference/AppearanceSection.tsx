"use client";

import { Check, ChevronDown } from "lucide-react";
import { useUserPreferences } from "@/components/layout/UserPreferencesProvider";
import type { EditablePreferences } from "./types";
import styles from "@/styles/settings/PreferencesPanel.module.css";
import { THEMES } from "./types";

export default function AppearanceSection({
  preferences,
  onUpdate,
  onSave,
  pending,
}: {
  preferences: EditablePreferences;
  onUpdate: (updates: Partial<EditablePreferences>) => void;
  onSave: () => void;
  pending: boolean;
}) {
  const { currencyRates, currencyRatesUpdatedAt, currencyRatesError } =
    useUserPreferences();

  return (
    <section className={styles.card} aria-labelledby="appearance-title">
      <header className={styles.panelHead}>
        <div>
          <h2 id="appearance-title" className={styles.cardTitle}>
            Appearance &amp; Display
          </h2>
          <p className={styles.cardSub}>
            Customize how StockWise looks and formats your data.
          </p>
        </div>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={onSave}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </header>

      <div className={styles.subsection}>
        <h3 className={styles.sectionLabel}>Theme</h3>
        <div className={styles.themeGrid}>
          {THEMES.map(({ label, theme, icon: Icon, sample }) => {
            const selected = preferences.theme === theme;
            return (
              <button
                type="button"
                key={theme}
                className={`${styles.themeCard} ${selected ? styles.themeSelected : ""}`}
                onClick={() => onUpdate({ theme })}
                aria-pressed={selected}
              >
                <span className={styles.themeHead}>
                  <Icon size={12} aria-hidden />
                  {label}
                  {selected && <Check size={12} aria-hidden />}
                </span>
                <span className={`${styles.themeSample} ${styles[sample]}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.preferenceGrid}>
        <label className={styles.field}>
          <span className={styles.sectionLabel}>Language</span>
          <span className={styles.selectWrap}>
            <select className={styles.input} defaultValue="en" disabled>
              <option value="en">English (US)</option>
            </select>
            <ChevronDown size={12} aria-hidden />
          </span>
          <span className={styles.prefDesc}>
            Additional languages are not available yet.
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.sectionLabel}>Date format</span>
          <span className={styles.selectWrap}>
            <select
              className={styles.input}
              value={preferences.date_format}
              onChange={(event) =>
                onUpdate({
                  date_format: event.target
                    .value as EditablePreferences["date_format"],
                })
              }
            >
              <option value="mdy">MM/DD/YYYY</option>
              <option value="dmy">DD/MM/YYYY</option>
              <option value="ymd">YYYY-MM-DD</option>
            </select>
            <ChevronDown size={12} aria-hidden />
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.sectionLabel}>Currency</span>
          <span className={styles.selectWrap}>
            <select
              className={styles.input}
              value={preferences.currency}
              onChange={(event) =>
                onUpdate({
                  currency: event.target
                    .value as EditablePreferences["currency"],
                })
              }
            >
              <option value="USD">USD - US Dollar ($)</option>
              <option value="PHP">PHP - Philippine Peso (₱)</option>
              <option value="EUR">EUR - Euro (€)</option>
            </select>
            <ChevronDown size={12} aria-hidden />
          </span>
        </label>
        <fieldset className={styles.fieldset}>
          <legend className={styles.sectionLabel}>Display density</legend>
          <div className={styles.segmented}>
            <button
              type="button"
              className={
                preferences.density === "comfortable"
                  ? styles.segmentActive
                  : ""
              }
              aria-pressed={preferences.density === "comfortable"}
              onClick={() => onUpdate({ density: "comfortable" })}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={
                preferences.density === "compact" ? styles.segmentActive : ""
              }
              aria-pressed={preferences.density === "compact"}
              onClick={() => onUpdate({ density: "compact" })}
            >
              Compact
            </button>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
