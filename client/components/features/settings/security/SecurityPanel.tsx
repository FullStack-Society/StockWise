"use client";

import { useState, useTransition } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { changeAccountPassword } from "@/lib/settings/actions";
import styles from "@/styles/settings/SecurityPanel.module.css";
import { METHODS, PRIVACY_OPTIONS } from "./types";

function UnavailableSwitch({ label }: { label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked="false"
      aria-label={`${label} unavailable`}
      disabled
      className={styles.switch}
    >
      <span />
    </button>
  );
}

export default function SecurityPanel() {
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await changeAccountPassword({
        current_password: passwords.current,
        new_password: passwords.next,
        confirm_password: passwords.confirm,
      });
      setMessage(result.ok ? "Password updated successfully." : result.error);
      if (result.ok) {
        setPasswords({ current: "", next: "", confirm: "" });
      }
    });
  }

  return (
    <div className={styles.stack}>
      <form
        className={styles.panel}
        aria-labelledby="password-title"
        onSubmit={submitPassword}
      >
        <header className={styles.header}>
          <div>
            <h2 id="password-title">Password</h2>
            <p>Use a strong password you don’t use anywhere else.</p>
          </div>
          <span className={styles.available}>Available</span>
        </header>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Current password</span>
          <input
            type="password"
            className={styles.input}
            autoComplete="current-password"
            value={passwords.current}
            onChange={(event) =>
              setPasswords((value) => ({
                ...value,
                current: event.target.value,
              }))
            }
            required
          />
        </label>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>New password</span>
            <input
              type="password"
              className={styles.input}
              autoComplete="new-password"
              minLength={12}
              maxLength={256}
              value={passwords.next}
              onChange={(event) =>
                setPasswords((value) => ({
                  ...value,
                  next: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Confirm new password</span>
            <input
              type="password"
              className={styles.input}
              autoComplete="new-password"
              minLength={12}
              maxLength={256}
              value={passwords.confirm}
              onChange={(event) =>
                setPasswords((value) => ({
                  ...value,
                  confirm: event.target.value,
                }))
              }
              required
            />
          </label>
        </div>
        <div className={styles.passwordFoot}>
          <p>Choose a password with at least 12 characters.</p>
          <button type="submit" className={styles.button} disabled={isPending}>
            <KeyRound size={12} aria-hidden />
            {isPending ? "Updating…" : "Update Password"}
          </button>
        </div>
        {message && (
          <p className={styles.formMessage} role="status">
            {message}
          </p>
        )}
      </form>

      <section className={styles.panel} aria-labelledby="two-factor-title">
        <header className={styles.header}>
          <div>
            <h2 id="two-factor-title">Two-Factor Authentication</h2>
            <p>Add an extra layer of security to your account.</p>
          </div>
          <UnavailableSwitch label="Two-factor authentication" />
        </header>
        <div className={styles.methodGrid}>
          {METHODS.map(({ name, detail, icon: Icon }) => (
            <article key={name} className={styles.method}>
              <Icon size={15} aria-hidden />
              <h3>{name}</h3>
              <p>{detail}</p>
              <span>Not available</span>
            </article>
          ))}
        </div>
        <div className={styles.backup}>
          <div className={styles.backupIcon}>
            <LockKeyhole size={14} aria-hidden />
          </div>
          <div>
            <h3>Backup codes</h3>
            <p>
              Recovery codes aren’t available until two-factor authentication is
              supported.
            </p>
          </div>
          <button type="button" className={styles.button} disabled>
            <ShieldCheck size={12} aria-hidden /> View Backup Codes
          </button>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="privacy-title">
        <header className={styles.header}>
          <div>
            <h2 id="privacy-title">Privacy</h2>
            <p>Manage how account information and activity are used.</p>
          </div>
        </header>
        <ul className={styles.privacyList}>
          {PRIVACY_OPTIONS.map(({ title, description }) => (
            <li key={title} className={styles.privacyRow}>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <UnavailableSwitch label={title} />
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Privacy controls remain unavailable until the account service supports
          them.
        </p>
      </section>
    </div>
  );
}
