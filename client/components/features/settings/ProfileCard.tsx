"use client";

import {
  User,
  ShieldCheck,
  SlidersHorizontal,
  DollarSign,
  ChevronRight,
  Building2,
} from "lucide-react";
import styles from "@/styles/settings/ProfileCard.module.css";
import type { SettingsSection } from "@/lib/settings/types";

const ITEMS = [
  { id: "profile", label: "Personal Profile", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "billing", label: "Billing & Subscription", icon: DollarSign },
] as const;

export default function ProfileCard({
  name,
  email,
  active,
  isOwner,
  canEditOrganization,
  onSelect,
}: {
  name: string;
  email: string;
  active: SettingsSection;
  isOwner: boolean;
  canEditOrganization: boolean;
  onSelect: (section: SettingsSection) => void;
}) {
  const visibleItems = ITEMS.filter((item) => {
    if (item.id === "billing") return isOwner;
    if (item.id === "organization") return canEditOrganization;
    return true;
  });

  return (
    <section className={styles.profileCard}>
      <div className={styles.avatar} aria-hidden />
      <div className={styles.profileName}>{name}</div>
      <div className={styles.profileEmail}>{email}</div>

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
  );
}
