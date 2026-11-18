"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, ShieldCheck, Smartphone } from "lucide-react";
import type { AccountSecurityStatus } from "@/lib/api/settings";
import { QRCodeSVG } from "qrcode.react";
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
  onTwoFactorChange,
}: {
  securityStatus: AccountSecurityStatus | null;
  onTwoFactorChange: (enabled: boolean) => void;
}) {
  const router = useRouter();
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
  const [enrollmentError, setEnrollmentError] = useState("");
  const enrollmentDialog = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    const dialog = enrollmentDialog.current;
    if (enrollment && dialog && !dialog.open) dialog.showModal();
    if (!enrollment && dialog?.open) dialog.close();
  }, [enrollment]);

  function startEnrollment() {
    setMfaMessage("");
    startTransition(async () => {
      try {
        setEnrollment(await beginTwoFactorEnrollment());
        setEnrollmentCode("");
        setEnrollmentError("");
      } catch {
        setMfaMessage("Could not start authenticator setup. Try again.");
      }
    });
  }

  function confirmEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnrollmentError("");
    startTransition(async () => {
      try {
        const result = await confirmTwoFactorEnrollment(enrollmentCode);
        setMfaEnabled(true);
        onTwoFactorChange(true);
        setEnrollment(null);
        setEnrollmentError("");
        setRecoveryCodes(result.recovery_codes);
        setMfaMessage("Two-factor authentication is enabled. Save your recovery codes now.");
        router.refresh();
      } catch {
        setEnrollmentError(
          "That code did not match. Use a fresh code from the authenticator entry made from this QR; codes change every 30 seconds. If it still fails, sync your phone’s date and time, cancel setup, and scan a newly generated QR.",
        );
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
        onTwoFactorChange(false);
        setDisableCode("");
        setRecoveryCodes([]);
        setMfaMessage("Two-factor authentication is disabled.");
        router.refresh();
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

      <dialog
        ref={enrollmentDialog}
        className={styles.enrollmentDialog}
        aria-labelledby="authenticator-setup-title"
        onCancel={(event) => {
          event.preventDefault();
          if (isPending) return;
          setEnrollment(null);
          setEnrollmentCode("");
        }}
        onClose={() => {
          setEnrollment(null);
          setEnrollmentCode("");
          setEnrollmentError("");
        }}
        onClick={(event) => {
          if (!isPending && event.target === event.currentTarget) {
            setEnrollment(null);
            setEnrollmentCode("");
          }
        }}
      >
        {enrollment && (
          <div className={styles.modalCard}>
            <header className={styles.modalHeader}>
              <div>
                <h2 id="authenticator-setup-title">Set up authenticator</h2>
                <p>Scan the QR code with your authenticator app.</p>
              </div>
            </header>
            <div className={styles.qrCode}>
              <QRCodeSVG
                value={enrollment.otpauth_uri}
                size={200}
                level="M"
                marginSize={4}
                title="Authenticator setup QR code"
              />
            </div>
            <p className={styles.mfaDescription}>
              In your app, choose to add an account, then enter the current 6-digit code below to confirm setup.
            </p>
            <details className={styles.secretDetails}>
              <summary>Can’t scan? Enter the setup key manually</summary>
              <div className={styles.secretKey}>
                <span>Setup key</span>
                <code>{enrollment.secret}</code>
              </div>
            </details>
            <form className={styles.mfaCodeForm} onSubmit={confirmEnrollment}>
              {enrollmentError && (
                <p className={styles.enrollmentError} role="alert">
                  {enrollmentError}
                </p>
              )}
              <label className={styles.field}>
                <span className={styles.fieldLabel}>6-digit authenticator code</span>
                <input
                  className={styles.input}
                  value={enrollmentCode}
                  onChange={(event) => {
                    setEnrollmentCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setEnrollmentError("");
                  }}
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
                <button type="button" className={styles.secondaryButton} onClick={() => setEnrollment(null)} disabled={isPending}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>

      <PrivacySection />
    </div>
  );
}
