"use client";

import { useEffect, useState } from "react";
import PreferenceToggle from "./PreferenceToggle";
import type { EditablePreferences } from "./types";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import styles from "@/styles/settings/preference/NotificationsSection.module.css";

export default function NotificationsSection({
  preferences,
  pending,
  message,
  onToggleInvitations,
}: {
  preferences: EditablePreferences;
  pending: boolean;
  message: string;
  onToggleInvitations: () => void;
}) {
  const {
    desktopStockAlertsEnabled,
    setDesktopStockAlertsEnabled,
  } = useUserPreferences();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    // Read the browser's permission state after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if ("Notification" in window) setPermission(Notification.permission);
    else setPermission("unsupported");
  }, []);

  const toggleDesktopAlerts = async () => {
    if (desktopStockAlertsEnabled) {
      setDesktopStockAlertsEnabled(false);
      return;
    }
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    setDesktopStockAlertsEnabled(nextPermission === "granted");
  };

  return (
    <section className={styles.card} aria-labelledby="notifications-title">
      <h2 id="notifications-title" className={styles.cardTitle}>
        Notifications
      </h2>
      <p className={styles.cardSub}>
        Get desktop alerts when inventory reaches its low or critical level.
      </p>
      <div className={styles.notificationWrap}>
        <div className={styles.alertRow}>
          <div>
            <strong>Desktop stock alerts</strong>
            <small>Only low-stock and critical-stock changes. Checks while StockWise is open.</small>
          </div>
          <PreferenceToggle
            label="Desktop low and critical stock alerts"
            enabled={desktopStockAlertsEnabled && permission === "granted"}
            disabled={permission === "unsupported" || permission === "denied"}
            onChange={() => void toggleDesktopAlerts()}
          />
        </div>
        <div className={styles.alertDetails}>
          {permission === "denied"
            ? "Notifications are blocked in your browser settings. Allow them there to enable alerts."
            : permission === "unsupported"
              ? "This browser does not support desktop notifications."
              : permission === "granted" && desktopStockAlertsEnabled
                ? "Enabled. StockWise checks for changes every 30 seconds while this page is open."
                : "Enable this setting and allow notifications when your browser asks."}
        </div>
        <div className={styles.alertRow}>
          <div>
            <strong>Organization invitations</strong>
            <small>Show in-app notifications for invitations and membership updates.</small>
          </div>
          <PreferenceToggle
            label="Organization invitation notifications"
            enabled={preferences.invitation_notifications}
            disabled={pending}
            onChange={onToggleInvitations}
          />
        </div>
      </div>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
