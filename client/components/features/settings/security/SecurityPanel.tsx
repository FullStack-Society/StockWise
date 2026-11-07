"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, ShieldCheck, Smartphone } from "lucide-react";
import type { AccountSecurityStatus } from "@/lib/api/settings";
import {
  beginTwoFactorEnrollment,
  confirmTwoFactorEnrollment,
  disableTwoFactor,
  getTwoFactorStatus,
} from "@/lib/settings/actions";
import styles from "@/styles/settings/security/SecurityPanel.module.css";
import PasswordSection from "./PasswordSection";
import PrivacySection from "./PrivacySection";

export default function SecurityPanel({
  securityStatus,
}: {
  securityStatus: AccountSecurityStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    otpauth_uri: string;
  } | null>(null);
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaMessage, setMfaMessage] = useState("");

  useEffect(() => {
    let active = true;
    getTwoFactorStatus()
      .then((result) => {
        if (active) setMfaEnabled(result.enabled);
      })
      .catch(() => {
        if (active) setMfaMessage("Could not load two-factor status. Refresh and try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  function startEnrollment() {
    setMfaMessage("");
    startTransition(async () => {
      try {
        setEnrollment(await beginTwoFactorEnrollment());
        setEnrollmentCode("");
      } catch {
        setMfaMessage("Could not start authenticator setup. Try again.");
      }
    });
  }

  function confirmEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMfaMessage("");
    startTransition(async () => {
      try {
        const result = await confirmTwoFactorEnrollment(enrollmentCode);
        setMfaEnabled(true);
        setEnrollment(null);
        setRecoveryCodes(result.recovery_codes);
        setMfaMessage("Two-factor authentication is enabled. Save your recovery codes now.");
      } catch {
        setMfaMessage("That code was not accepted. Enter the current code from your authenticator app.");
      }
    });
  }

  function turnOffMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMfaMessage("");
    startTransition(async () => {
      try {
        await disableTwoFactor(disableCode);
        setMfaEnabled(false);
        setDisableCode("");
        setRecoveryCodes([]);
        setMfaMessage("Two-factor authentication is disabled.");
      } catch {
        setMfaMessage("Enter a valid authenticator code or unused recovery code.");
      }
    });
  }

  return (
    <div className={styles.stack}>
      <PasswordSection />

      <section className={styles.panel} aria-labelledby="security-title">
        <header className={styles.header}>
          <div>
            <h2 id="security-title">Security</h2>
            <p>Manage your authenticator app and Google sign-in connection.</p>
          </div>
          <span className={mfaEnabled ? styles.enabledBadge : styles.disabledBadge}>
            {mfaEnabled === null
              ? "Authenticator loading…"
              : mfaEnabled
                ? "Authenticator enabled"
                : "Authenticator disabled"}
          </span>
        </header>
        {mfaEnabled ? (
          <form className={styles.mfaCodeForm} onSubmit={turnOffMfa}>
            <p className={styles.mfaDescription}>
              Authenticator codes are required for password and Google sign-in. Use one of the recovery codes if you lose access to the app.
            </p>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Authenticator or recovery code</span>
              <input
                className={styles.input}
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
                autoComplete="one-time-code"
                required
              />
            </label>
            <button type="submit" className={styles.button} disabled={isPending}>
              <ShieldCheck size={12} aria-hidden />
              {isPending ? "Updating…" : "Turn off two-factor authentication"}
            </button>
          </form>
        ) : enrollment ? (
          <div className={styles.mfaSetup}>
            <p className={styles.mfaDescription}>
              In your authenticator app, add an account using the setup key below. Choose time-based codes (TOTP).
            </p>
            <div className={styles.secretKey}>
              <span>Setup key</span>
              <code>{enrollment.secret}</code>
            </div>
            <form className={styles.mfaCodeForm} onSubmit={confirmEnrollment}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Enter the 6-digit app code to confirm</span>
                <input
                  className={styles.input}
                  value={enrollmentCode}
                  onChange={(event) => setEnrollmentCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
              <div className={styles.mfaActions}>
                <button type="submit" className={styles.button} disabled={isPending}>
                  <ShieldCheck size={12} aria-hidden />
                  {isPending ? "Verifying…" : "Verify and enable"}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setEnrollment(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className={styles.backup}>
            <div className={styles.backupIcon}>
              <Smartphone size={14} aria-hidden />
            </div>
            <div>
              <h3>Authenticator app</h3>
              <p>Use Google Authenticator, Microsoft Authenticator, or another TOTP app. No SMS plan or email delivery is needed.</p>
            </div>
            <button
              type="button"
              className={styles.button}
              disabled={isPending || mfaEnabled === null}
              onClick={startEnrollment}
            >
              <ShieldCheck size={12} aria-hidden />
              {isPending ? "Starting…" : "Set up"}
            </button>
          </div>
        )}
        {recoveryCodes.length > 0 && (
          <div className={styles.recoveryCodes}>
            <h3>Save these recovery codes</h3>
            <p>Each code works once. They will not be shown again after you leave this page.</p>
            <div>{recoveryCodes.map((code) => <code key={code}>{code}</code>)}</div>
            <button type="button" className={styles.secondaryButton} onClick={() => setRecoveryCodes([])}>
              I saved these codes
            </button>
          </div>
        )}
        {mfaMessage && <p className={styles.formMessage} role="status">{mfaMessage}</p>}
        <div className={styles.backup}>
          <div className={styles.backupIcon}>
            <Link2 size={14} aria-hidden />
          </div>
          <div>
            <h3>Google account</h3>
            <p>
              {securityStatus?.google_account_connected
                ? "Your Google account has been used to sign in to this StockWise account."
                : "Sign in with Google using the same email address to connect it to this account."}
            </p>
          </div>
          <span
            className={securityStatus?.google_account_connected ? styles.enabledBadge : styles.disabledBadge}
          >
            {securityStatus === null
              ? "Loading…"
              : securityStatus.google_account_connected
                ? "Connected"
                : "Not connected"}
          </span>
        </div>
      </section>

      <PrivacySection />
    </div>
  );
}
