"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import PreferenceToggle from "../preference/PreferenceToggle";
import { savePreferences } from "@/lib/settings/actions";
import styles from "@/styles/settings/profile/ProfileOverviewPanel.module.css";

export default function ProfileOverviewPanel() {
  const router = useRouter();
  const preferences = useUserPreferences();
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Read the browser permission after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if ("Notification" in window) setNotificationPermission(Notification.permission);
    else setNotificationPermission("unsupported");
  }, []);

  async function toggleDesktopNotifications() {
    setMessage("");
    if (preferences.desktopStockAlertsEnabled) {
      preferences.setDesktopStockAlertsEnabled(false);
      return;
    }
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setMessage("This browser does not support desktop notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    preferences.setDesktopStockAlertsEnabled(permission === "granted");
    if (permission !== "granted") {
      setMessage("Allow notifications in your browser to turn on stock alerts.");
    }
  }

  function toggleAutoSync() {
    if (isPending) return;
    setMessage("");
    const nextEnabled = !preferences.auto_sync_reports;
    startTransition(async () => {
      const result = await savePreferences({
        invitation_notifications: preferences.invitation_notifications,
        theme: preferences.theme,
        date_format: preferences.date_format,
        currency: preferences.currency,
        density: preferences.density,
        auto_sync_reports: nextEnabled,
        prioritize_low_stock: preferences.prioritize_low_stock,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      preferences.setAutoSyncReportsEnabled(nextEnabled);
      setMessage("Auto-sync preference saved.");
      router.refresh();
    });
  }

  return (
    <section className={styles.panel} aria-labelledby="profile-overview-title">
      <h2 id="profile-overview-title" className={styles.title}>
        Preferences &amp; Security
      </h2>
      <ul className={styles.list}>
        <li className={styles.row}>
          <span className={styles.icon} aria-hidden>
            <Bell size={14} />
          </span>
          <div className={styles.copy}>
            <h3>Desktop stock notifications</h3>
            <p>
              {notificationPermission === "unsupported"
                ? "This browser does not support desktop notifications."
                : preferences.desktopStockAlertsEnabled && notificationPermission === "granted"
                  ? "Low and critical stock alerts are enabled."
                  : "Get alerts for low and critical stock changes."}
            </p>
          </div>
          <PreferenceToggle
            label="Desktop low and critical stock notifications"
            enabled={preferences.desktopStockAlertsEnabled && notificationPermission === "granted"}
            disabled={notificationPermission === "unsupported" || notificationPermission === "denied"}
            onChange={() => void toggleDesktopNotifications()}
          />
        </li>
        <li className={styles.row}>
          <span className={styles.icon} aria-hidden>
            <RefreshCw size={14} />
          </span>
          <div className={styles.copy}>
            <h3>Auto-sync Dashboard and Reports</h3>
            <p>Refresh both pages every 15 minutes while open.</p>
          </div>
          <PreferenceToggle
            label="Auto-sync Dashboard and Reports every 15 minutes"
            enabled={preferences.auto_sync_reports}
            disabled={isPending}
            onChange={toggleAutoSync}
          />
        </li>
      </ul>
      {message && <p className={styles.note} role="status">{message}</p>}
    </section>
  );
}
