"use client";

import {
  User,
  ShieldCheck,
  SlidersHorizontal,
  DollarSign,
  ChevronRight,
  Activity,
} from "lucide-react";
import type { AccountSettings } from "@/lib/api/settings";
import styles from "@/styles/settings/ProfileCard.module.css";
import type { SettingsSection } from "@/lib/settings/types";

const ITEMS = [
  { id: "profile", label: "Personal Profile", icon: User },
  { id: "security", label: "Security & Privacy", icon: ShieldCheck },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "billing", label: "Billing & Subscription", icon: DollarSign },
] as const;

export default function ProfileCard({
  settings,
  roleLabel,
  active,
  isOwner,
  onSelect,
}: {
  settings: AccountSettings;
  roleLabel: string;
  active: SettingsSection;
  isOwner: boolean;
  onSelect: (section: SettingsSection) => void;
}) {
  const visibleItems = ITEMS.filter((item) => {
    if (item.id === "billing") return isOwner;
    return true;
  });
  const completedDetails = [
    settings.name,
    settings.email,
    roleLabel,
    settings.timezone,
  ].filter(Boolean).length;
  const completion = Math.round((completedDetails / 4) * 100);

  return (
    <div className={styles.sidebarStack}>
      <section className={styles.profileCard}>
        <div className={styles.avatar} aria-hidden />
        <div className={styles.profileName}>{settings.name}</div>
        <div className={styles.profileRole}>{roleLabel}</div>

        <nav className={styles.settingsNav} aria-label="Settings sections">
          {visibleItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${active === id ? styles.navItemActive : ""}`}
              aria-current={active === id ? "true" : undefined}
              onClick={() => onSelect(id)}
            >
              <Icon size={14} aria-hidden />
              <span className={styles.navLabel}>{label}</span>
              {active === id && <ChevronRight size={14} aria-hidden />}
            </button>
          ))}
        </nav>
      </section>

      <section className={styles.healthCard} aria-label="Profile completeness">
        <h2 className={styles.healthTitle}>
          <Activity size={13} aria-hidden />
          Account health
        </h2>
        <div
          className={styles.healthTrack}
          role="progressbar"
          aria-label="Profile details complete"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
        >
          <span style={{ width: `${completion}%` }} />
        </div>
        <p className={styles.healthNote}>
          {completion}% complete · {completedDetails} of 4 details available
        </p>
      </section>
    </div>
  );
}
