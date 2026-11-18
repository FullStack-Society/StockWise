"use client";

import { useEffect } from "react";
import { logout } from "@/lib/auth/actions";
import { getSecurityPrivacyPreferences } from "@/lib/settings/actions";

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_KEY = "stockwise_idle_last_activity";
const SETTING_KEY = "stockwise_idle_sign_out_enabled";

export default function IdleSessionGuard() {
  useEffect(() => {
    let enabled = false;
    let signingOut = false;
    let preferenceChanged = false;
    let lastActivity = Date.now();
    let lastActivityStored = 0;

    const recordActivity = () => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastActivityStored >= 5_000) {
        lastActivityStored = now;
        try {
          window.localStorage.setItem(ACTIVITY_KEY, String(now));
        } catch {
          // In-memory activity tracking still works when browser storage is unavailable.
        }
      }
    };

    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled !== "boolean") return;
      enabled = detail.enabled;
      preferenceChanged = true;
      lastActivity = Date.now();
      try {
        window.localStorage.setItem(SETTING_KEY, String(enabled));
      } catch {
        // This tab still applies the changed preference.
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_KEY && event.newValue) {
        const activityAt = Number(event.newValue);
        if (Number.isFinite(activityAt)) lastActivity = Math.max(lastActivity, activityAt);
      }
      if (event.key === SETTING_KEY && event.newValue !== null) {
        enabled = event.newValue === "true";
        preferenceChanged = true;
        lastActivity = Date.now();
      }
    };

    getSecurityPrivacyPreferences()
      .then((preferences) => {
        if (preferenceChanged) return;
        enabled = preferences.auto_sign_out_idle;
        lastActivity = Date.now();
        try {
          window.localStorage.setItem(SETTING_KEY, String(enabled));
        } catch {
          // The server preference remains authoritative for this tab.
        }
      })
      .catch(() => {
        // An unavailable optional privacy preference must not interrupt the session.
      });

    const activityEvents = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"] as const;
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("stockwise:idle-sign-out-setting", onPreferenceChange);
    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => {
      if (enabled && !signingOut && Date.now() - lastActivity >= IDLE_LIMIT_MS) {
        signingOut = true;
        void logout().catch(() => {
          signingOut = false;
        });
      }
    }, 15_000);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity),
      );
      window.removeEventListener("stockwise:idle-sign-out-setting", onPreferenceChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
