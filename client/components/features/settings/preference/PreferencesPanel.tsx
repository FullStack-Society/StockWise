"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountSettings } from "@/lib/api/settings";
import { savePreferences, saveProfileSettings } from "@/lib/settings/actions";
import AppearanceSection from "./AppearanceSection";
import InventoryDefaultsSection from "./InventoryDefaultsSection";
import NotificationsSection from "./NotificationsSection";
import RegionalSection from "./RegionalSection";
import {
  DEFAULT_PREFERENCES,
  type EditablePreferences,
} from "./types";
import styles from "@/styles/settings/PreferencesPanel.module.css";

export default function PreferencesPanel({
  settings,
}: {
  settings: AccountSettings;
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<EditablePreferences>({
    invitation_notifications: settings.invitation_notifications,
    theme: settings.theme,
    date_format: settings.date_format,
    currency: settings.currency,
    density: settings.density,
    auto_sync_reports: settings.auto_sync_reports,
    prioritize_low_stock: settings.prioritize_low_stock,
  });
  const [timezone, setTimezone] = useState(settings.timezone);
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [regionalMessage, setRegionalMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [timezonePending, startTimezoneTransition] = useTransition();

  function updatePreferences(updates: Partial<EditablePreferences>) {
    setPreferences((current) => ({ ...current, ...updates }));
  }

  function savePreferenceValues(next: EditablePreferences) {
    setPreferenceMessage("");
    startTransition(async () => {
      const result = await savePreferences(next);
      setPreferenceMessage(result.ok ? "Preferences saved." : result.error);
      if (result.ok) {
        router.refresh();
      } else {
        setPreferences((current) => ({
          ...current,
          invitation_notifications: settings.invitation_notifications,
        }));
      }
    });
  }

  function savePreferencesForm() {
    savePreferenceValues(preferences);
  }

  function toggleInvitations() {
    const next = {
      ...preferences,
      invitation_notifications: !preferences.invitation_notifications,
    };
    setPreferences(next);
    savePreferenceValues(next);
  }

  function saveTimezone() {
    setRegionalMessage("");
    startTimezoneTransition(async () => {
      const result = await saveProfileSettings({
        name: settings.name,
        timezone,
      });
      setRegionalMessage(result.ok ? "Timezone saved." : result.error);
      if (result.ok) router.refresh();
    });
  }

  function resetPreferences() {
    setRegionalMessage("");
    setPreferenceMessage("");
    startTransition(async () => {
      const [preferenceResult, timezoneResult] = await Promise.all([
        savePreferences(DEFAULT_PREFERENCES),
        saveProfileSettings({
          name: settings.name,
          timezone: "Asia/Manila",
        }),
      ]);
      if (preferenceResult.ok) setPreferences(DEFAULT_PREFERENCES);
      if (timezoneResult.ok) setTimezone("Asia/Manila");
      if (preferenceResult.ok && timezoneResult.ok) {
        setRegionalMessage("Preferences reset to defaults.");
      } else {
        const errors = [
          !preferenceResult.ok ? preferenceResult.error : "",
          !timezoneResult.ok ? timezoneResult.error : "",
        ].filter(Boolean);
        setRegionalMessage(errors.join(" "));
      }
      if (preferenceResult.ok || timezoneResult.ok) router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      <AppearanceSection
        preferences={preferences}
        onUpdate={updatePreferences}
        onSave={savePreferencesForm}
        pending={isPending}
      />
      <NotificationsSection
        preferences={preferences}
        pending={isPending}
        message={preferenceMessage}
        onToggleInvitations={toggleInvitations}
      />
      <InventoryDefaultsSection
        preferences={preferences}
        pending={isPending}
        onUpdate={updatePreferences}
        onSave={savePreferencesForm}
      />
      <RegionalSection
        timezone={timezone}
        message={regionalMessage}
        pending={timezonePending}
        resetting={isPending}
        onTimezoneChange={setTimezone}
        onSave={saveTimezone}
        onReset={resetPreferences}
      />
    </div>
  );
}
