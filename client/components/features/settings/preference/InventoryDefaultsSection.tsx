"use client";

import PreferenceToggle from "./PreferenceToggle";
import type { EditablePreferences } from "./types";
import styles from "@/styles/settings/PreferencesPanel.module.css";

export default function InventoryDefaultsSection({
  preferences,
  pending,
  onUpdate,
  onSave,
}: {
  preferences: EditablePreferences;
  pending: boolean;
  onUpdate: (updates: Partial<EditablePreferences>) => void;
  onSave: () => void;
}) {
  return (
    <section
      className={styles.card}
      aria-labelledby="inventory-defaults-title"
    >
      <h2 id="inventory-defaults-title" className={styles.cardTitle}>
        Inventory Defaults
      </h2>
      <p className={styles.cardSub}>
        Stock alert thresholds used by StockWise and inventory display behavior.
      </p>
      <div className={styles.preferenceGrid}>
        <div className={styles.field}>
          <span className={styles.sectionLabel}>Low-stock threshold</span>
          <div className={styles.readonlySetting}>
            50 units <span>Fixed by StockWise</span>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.sectionLabel}>Critical threshold</span>
          <div className={styles.readonlySetting}>
            25 units <span>Fixed by StockWise</span>
          </div>
        </div>
        <label className={styles.field}>
          <span className={styles.sectionLabel}>Unit of measure</span>
          <select className={styles.input} defaultValue="pieces" disabled>
            <option value="pieces">Pieces (default)</option>
          </select>
          <span className={styles.prefDesc}>
            Custom units are not supported yet.
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.sectionLabel}>Default warehouse</span>
          <select className={styles.input} defaultValue="" disabled>
            <option value="">No warehouses configured</option>
          </select>
        </label>
      </div>
      <ul className={styles.prefList}>
        <li className={styles.prefRow}>
          <div>
            <div className={styles.prefTitle}>
              Auto-sync reports every 15 minutes
            </div>
            <div className={styles.prefDesc}>
              Reload the Reports page every 15 minutes while it is open.
            </div>
          </div>
          <PreferenceToggle
            label="Refresh reports every 15 minutes"
            enabled={preferences.auto_sync_reports}
            onChange={() =>
              onUpdate({
                auto_sync_reports: !preferences.auto_sync_reports,
              })
            }
          />
        </li>
        <li className={styles.prefRow}>
          <div>
            <div className={styles.prefTitle}>
              Prioritize low-stock products
            </div>
            <div className={styles.prefDesc}>
              Sort critical and low-stock products ahead of in-stock items.
            </div>
          </div>
          <PreferenceToggle
            label="Prioritize low-stock products"
            enabled={preferences.prioritize_low_stock}
            onChange={() =>
              onUpdate({
                prioritize_low_stock: !preferences.prioritize_low_stock,
              })
            }
          />
        </li>
      </ul>
      <div className={styles.panelFooter}>
        <button
          type="button"
          className={styles.saveButton}
          onClick={onSave}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </section>
  );
}
