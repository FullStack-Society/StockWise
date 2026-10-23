import { Search, Eye, Lock } from "lucide-react";
import { settingsFooterStats } from "@/lib/mock-data/settings";
import styles from "@/styles/settings/SettingsFooterStats.module.css";

const ICONS = { search: Search, eye: Eye, lock: Lock };

export default function SettingsFooterStats() {
  return (
    <section className={styles.footerGrid}>
      {settingsFooterStats.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <div key={s.id} className={styles.footerCard}>
            <Icon size={16} className={styles.footerIcon} aria-hidden />
            <div>
              <div className={styles.footerLabel}>{s.label}</div>
              <div className={styles.footerValue}>{s.value}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
