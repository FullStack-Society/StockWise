"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SecurityPrivacyPreferences } from "@/lib/api/settings";
import {
  getUsageAnalyticsConsent,
  getSecurityPrivacyPreferences,
  saveSecurityPrivacyPreferences,
  setUsageAnalyticsConsent,
} from "@/lib/settings/actions";
import PreferenceToggle from "../preference/PreferenceToggle";
import styles from "@/styles/settings/security/SecurityPanel.module.css";
import { PRIVACY_OPTIONS } from "./types";

export default function PrivacySection() {
  const router = useRouter();
  const [usageAnalyticsEnabled, setUsageAnalyticsEnabled] = useState<boolean | null>(null);
  const [securityPrivacy, setSecurityPrivacy] = useState<SecurityPrivacyPreferences | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getSecurityPrivacyPreferences().then((preferences) => {
      if (active) setSecurityPrivacy(preferences);
    }).catch(() => {
      if (active) setPrivacyMessage("Could not load privacy settings. Refresh and try again.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getUsageAnalyticsConsent().then(({ enabled }) => {
      if (active) setUsageAnalyticsEnabled(enabled);
    }).catch(() => {
      if (active) setPrivacyMessage("Could not load analytics preference. Refresh and try again.");
    });
    return () => { active = false; };
  }, []);

  function toggleUsageAnalytics() {
    if (usageAnalyticsEnabled === null || isPending) return;
    setPrivacyMessage("");
    startTransition(async () => {
      try {
        const saved = await setUsageAnalyticsConsent(!usageAnalyticsEnabled);
        setUsageAnalyticsEnabled(saved.enabled);
        router.refresh();
        setPrivacyMessage(saved.enabled
          ? "Anonymous usage analytics enabled for this account."
          : "Usage analytics turned off. No new visits will be counted.");
      } catch {
        setPrivacyMessage("Could not save the analytics preference. Try again.");
      }
    });
  }

  function toggleSecurityPreference(key: keyof SecurityPrivacyPreferences) {
    if (!securityPrivacy || isPending) return;
    const next = { ...securityPrivacy, [key]: !securityPrivacy[key] };
    setPrivacyMessage("");
    startTransition(async () => {
      const result = await saveSecurityPrivacyPreferences(next);
      if (!result.ok) { setPrivacyMessage(result.error); return; }
      setSecurityPrivacy(result.preferences);
      router.refresh();
      if (key === "auto_sign_out_idle") {
        window.dispatchEvent(new CustomEvent("stockwise:idle-sign-out-setting", {
          detail: { enabled: result.preferences.auto_sign_out_idle },
        }));
      }
      setPrivacyMessage(key === "login_alert_emails"
        ? result.preferences.login_alert_emails ? "Sign-in alert emails enabled." : "Sign-in alert emails turned off."
        : result.preferences.auto_sign_out_idle ? "Automatic sign-out enabled after 30 minutes of inactivity." : "Automatic sign-out turned off.");
    });
  }

  return (
    <section className={styles.panel} aria-labelledby="privacy-title">
      <header className={styles.header}>
        <div><h2 id="privacy-title">Privacy</h2><p>Manage how account information and activity are used.</p></div>
      </header>
      <ul className={styles.privacyList}>
        {PRIVACY_OPTIONS.map(({ title, description }) => (
          <li key={title} className={styles.privacyRow}>
            <div><h3>{title}</h3><p>{description}</p></div>
            {title === "Store usage analytics" ? (
              <PreferenceToggle label="Store anonymous usage analytics" enabled={usageAnalyticsEnabled ?? false}
                disabled={usageAnalyticsEnabled === null || isPending} onChange={toggleUsageAnalytics} />
            ) : title === "Auto sign-out after inactivity" ? (
              <PreferenceToggle label="Sign out after 30 minutes of inactivity" enabled={securityPrivacy?.auto_sign_out_idle ?? false}
                disabled={securityPrivacy === null || isPending} onChange={() => toggleSecurityPreference("auto_sign_out_idle")} />
            ) : title === "Login alert emails" ? (
              <PreferenceToggle label="Email me when a new device or browser signs in" enabled={securityPrivacy?.login_alert_emails ?? false}
                disabled={securityPrivacy === null || isPending} onChange={() => toggleSecurityPreference("login_alert_emails")} />
            ) : null}
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        Analytics stores only daily page-view totals per organization. It does not store account identities, products, or inventory details. Turning it off stops future counting; past totals remain anonymous.
        Login alerts go to your account email when a new browser or device signs in. Automatic sign-out applies across this browser after 30 minutes without activity.
      </p>
      {privacyMessage && <p className={styles.formMessage} role="status">{privacyMessage}</p>}
    </section>
  );
}
