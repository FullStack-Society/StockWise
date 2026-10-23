"use client";

import { useState } from "react";
import {
  User,
  ShieldCheck,
  Settings,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { profileDefaults } from "@/lib/mock-data/settings";
import styles from "@/styles/settings/ProfileCard.module.css";

const ITEMS = [
  { id: "profile", label: "Personal Profile", icon: User, target: "profile" },
  {
    id: "security",
    label: "Security & Privacy",
    icon: ShieldCheck,
    target: "preferences-security",
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: Settings,
    target: "preferences-security",
  },
  {
    id: "billing",
    label: "Billing & Subscription",
    icon: DollarSign,
    target: null,
  },
] as const;

export default function ProfileCard({ name }: { name: string }) {
  const [active, setActive] = useState<string>("profile");

  function go(id: string, target: string | null) {
    if (!target) return; // Billing is not built yet
    setActive(id);
    document
      .getElementById(target)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className={styles.profileCard}>
      <div className={styles.avatar} aria-hidden />
      <div className={styles.profileName}>{name}</div>
      <div className={styles.profileJoined}>
        Joined {profileDefaults.joined}
      </div>

      <nav className={styles.settingsNav} aria-label="Settings sections">
        {ITEMS.map(({ id, label, icon: Icon, target }) => (
          <button
            key={id}
            type="button"
            disabled={!target}
            className={`${styles.navItem} ${active === id ? styles.navItemActive : ""}`}
            aria-current={active === id ? "true" : undefined}
            onClick={() => go(id, target)}
          >
            <Icon size={14} aria-hidden />
            <span className={styles.navLabel}>{label}</span>
            {active === id && <ChevronRight size={14} aria-hidden />}
          </button>
        ))}
      </nav>
    </section>
  );
}
