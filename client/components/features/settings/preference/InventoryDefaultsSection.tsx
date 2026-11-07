"use client";

import PreferenceToggle from "./PreferenceToggle";
import type { EditablePreferences } from "./types";
import styles from "@/styles/settings/preference/InventoryDefaultsSection.module.css";

export default function InventoryDefaultsSection({
  preferences,
  pending,
  defaultReorderPoint,
  onDefaultReorderPointChange,
  onUpdate,
  onSave,
}: {
  preferences: EditablePreferences;
  pending: boolean;
  defaultReorderPoint: string;
  onDefaultReorderPointChange: (value: string) => void;
  onUpdate: (updates: Partial<EditablePreferences>) => void;
  onSave: () => void;
}) {
  return (
    <section className={styles.card} aria-labelledby="inventory-defaults-title">
      <h2 id="inventory-defaults-title" className={styles.cardTitle}>
        Inventory Defaults
      </h2>
      <p className={styles.cardSub}>
        Stock alerts use each product’s reorder point; zero stock is critical.
      </p>
      <div className={styles.preferenceGrid}>
        <div className={styles.field}>
          <label
            htmlFor="default-reorder-point"
            className={styles.sectionLabel}
          >
            Default low-stock threshold
          </label>
          <input
            id="default-reorder-point"
            className={styles.input}
            type="number"
            min={0}
            max={2_147_483_647}
            step={1}
            required
            value={defaultReorderPoint}
            onChange={(event) =>
              onDefaultReorderPointChange(event.target.value)
            }
            disabled={pending}
          />
          <span className={styles.prefDesc}>
            Used as the starting reorder point for new products and imports.
            Existing products are unchanged.
          </span>
        </div>
        <div className={styles.field}>
          <span className={styles.sectionLabel}>Critical threshold</span>
          <div className={styles.readonlySetting}>
            0 units <span>Critical means out of stock</span>
          </div>
        </div>
      </div>
      <ul className={styles.prefList}>
        <li className={styles.prefRow}>
          <div>
            <div className={styles.prefTitle}>
              Auto-sync Dashboard and Reports
            </div>
            <div className={styles.prefDesc}>
              Refresh the Dashboard and Reports every 15 minutes while either
              page is open.
            </div>
          </div>
          <PreferenceToggle
            label="Refresh Dashboard and Reports every 15 minutes"
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
