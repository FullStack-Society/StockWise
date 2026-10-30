import { Bell, RefreshCw, ShieldCheck } from "lucide-react";
import styles from "@/styles/settings/ProfileOverviewPanel.module.css";

const ITEMS = [
  {
    title: "Two-factor authentication",
    description: "An additional layer of security for your account.",
    icon: ShieldCheck,
  },
  {
    title: "Desktop notifications",
    description: "Receive real-time alerts for low stock and new orders.",
    icon: Bell,
  },
  {
    title: "Auto-sync reports",
    description: "Automatically refresh analytics every 15 minutes.",
    icon: RefreshCw,
  },
];

export default function ProfileOverviewPanel() {
  return (
    <section className={styles.panel} aria-labelledby="profile-overview-title">
      <h2 id="profile-overview-title" className={styles.title}>
        Preferences &amp; Security
      </h2>
      <ul className={styles.list}>
        {ITEMS.map(({ title, description, icon: Icon }) => (
          <li key={title} className={styles.row}>
            <span className={styles.icon} aria-hidden>
              <Icon size={14} />
            </span>
            <div className={styles.copy}>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <span className={styles.unavailable}>Unavailable</span>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        These preview controls aren’t available in the current account service.
      </p>
    </section>
  );
}
