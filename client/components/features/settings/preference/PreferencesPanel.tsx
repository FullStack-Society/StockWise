"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountSettings } from "@/lib/api/settings";
import {
  saveInventoryDefaults,
  savePreferences,
  saveProfileSettings,
} from "@/lib/settings/actions";
import AppearanceSection from "./AppearanceSection";
import InventoryDefaultsSection from "./InventoryDefaultsSection";
import NotificationsSection from "./NotificationsSection";
import { TIMEZONES, type EditablePreferences } from "./types";
import styles from "@/styles/settings/preference/PreferencesPanel.module.css";

export default function PreferencesPanel({
  settings,
  defaultReorderPoint,
}: {
  settings: AccountSettings;
  defaultReorderPoint: number;
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
  const [inventoryReorderPoint, setInventoryReorderPoint] = useState(
    String(defaultReorderPoint),
  );
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [isPending, startTransition] = useTransition();

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
    setPreferenceMessage("");
    if (!inventoryReorderPoint.trim()) {
      setPreferenceMessage("Enter a default low-stock threshold.");
      return;
    }
    const parsedReorderPoint = Number(inventoryReorderPoint);
    if (
      !Number.isInteger(parsedReorderPoint) ||
      parsedReorderPoint < 0 ||
      parsedReorderPoint > 2_147_483_647
    ) {
      setPreferenceMessage(
        "Enter a valid non-negative whole number for the low-stock default.",
      );
      return;
    }
    startTransition(async () => {
      const [preferenceResult, profileResult, inventoryResult] =
        await Promise.all([
          savePreferences(preferences),
          saveProfileSettings({ name: settings.name, timezone }),
          saveInventoryDefaults(parsedReorderPoint),
        ]);
      const errors = [
        !preferenceResult.ok ? preferenceResult.error : "",
        !profileResult.ok ? profileResult.error : "",
        !inventoryResult.ok ? inventoryResult.error : "",
      ].filter(Boolean);
      setPreferenceMessage(
        errors.length ? errors.join(" ") : "Preferences saved.",
      );
      if (preferenceResult.ok || profileResult.ok || inventoryResult.ok) {
        router.refresh();
      }
    });
  }

  function toggleInvitations() {
    const next = {
      ...preferences,
      invitation_notifications: !preferences.invitation_notifications,
    };
    setPreferences(next);
    savePreferenceValues(next);
  }

  return (
    <div className={styles.stack}>
      <AppearanceSection
        preferences={preferences}
        onUpdate={updatePreferences}
        onSave={savePreferencesForm}
        pending={isPending}
        timezone={timezone}
        timezones={TIMEZONES}
        onTimezoneChange={setTimezone}
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
        defaultReorderPoint={inventoryReorderPoint}
        onDefaultReorderPointChange={setInventoryReorderPoint}
        onUpdate={updatePreferences}
        onSave={savePreferencesForm}
      />
    </div>
  );
}
