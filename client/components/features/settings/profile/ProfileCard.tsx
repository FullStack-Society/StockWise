"use client";

import {
  Camera,
  User,
  ShieldCheck,
  SlidersHorizontal,
  DollarSign,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import type { AccountSecurityStatus, AccountSettings } from "@/lib/api/settings";
import { saveProfileAvatar } from "@/lib/settings/actions";
import styles from "@/styles/settings/profile/ProfileCard.module.css";
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
  securityStatus,
  onSelect,
}: {
  settings: AccountSettings;
  roleLabel: string;
  active: SettingsSection;
  isOwner: boolean;
  securityStatus: AccountSecurityStatus | null;
  onSelect: (section: SettingsSection) => void;
}) {
  const router = useRouter();
  const { avatarData, setAvatarData } = useUserPreferences();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [isSavingAvatar, startAvatarSave] = useTransition();

  async function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarMessage("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarMessage("Choose an image smaller than 10 MB.");
      return;
    }

    setAvatarMessage("");
    try {
      const bitmap = await createImageBitmap(file);
      const side = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        throw new Error("Could not prepare this image.");
      }
      context.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        320,
        320,
      );
      bitmap.close();
      const resizedAvatar = canvas.toDataURL("image/jpeg", 0.82);
      setAvatarMessage("Saving picture…");
      startAvatarSave(async () => {
        const result = await saveProfileAvatar(resizedAvatar);
        if (!result.ok) {
          setAvatarMessage(result.error);
          return;
        }
        setAvatarData(resizedAvatar);
        setAvatarMessage("Profile picture updated.");
        router.refresh();
      });
    } catch {
      setAvatarMessage("Could not read that image. Choose a different file.");
    }
  }

  const visibleItems = ITEMS.filter((item) => {
    if (item.id === "billing") return isOwner;
    return true;
  });
  const completedChecks = securityStatus
    ? Number(securityStatus.two_factor_enabled) +
      Number(securityStatus.google_account_connected)
    : 0;
  const completion = Math.round((completedChecks / 2) * 100);

  return (
    <div className={styles.sidebarStack}>
      <section className={styles.profileCard}>
        <input
          ref={avatarInput}
          className={styles.avatarInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onAvatarSelected}
          aria-label="Choose a profile picture"
        />
        <button
          className={styles.avatarButton}
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={isSavingAvatar}
          aria-label="Change profile picture"
          title="Change profile picture"
        >
          <span className={styles.avatarImage}>
            {avatarData ? (
              <Image
                src={avatarData}
                alt=""
                width={320}
                height={320}
                unoptimized
              />
            ) : (
              <User size={24} aria-hidden />
            )}
          </span>
          <span className={styles.avatarCamera} aria-hidden>
            <Camera size={12} />
          </span>
        </button>
        {avatarMessage && (
          <p
            className={styles.avatarMessage}
            role={
              isSavingAvatar || avatarMessage === "Profile picture updated."
                ? "status"
                : "alert"
            }
          >
            {isSavingAvatar ? "Saving picture…" : avatarMessage}
          </p>
        )}
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
          aria-label="Account security checks complete"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
        >
          <span style={{ width: `${completion}%` }} />
        </div>
        <p className={styles.healthNote}>
          {securityStatus
            ? `${completedChecks} of 2 security checks · ${completion}% complete`
            : "Checking authentication and Google account…"}
        </p>
      </section>
    </div>
  );
}
