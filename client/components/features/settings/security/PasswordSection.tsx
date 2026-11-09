"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { changeAccountPassword } from "@/lib/settings/actions";
import styles from "@/styles/settings/security/SecurityPanel.module.css";

export default function PasswordSection() {
  const router = useRouter();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
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
        router.refresh();
      }
    });
  }

  return (
    <form className={styles.panel} aria-labelledby="password-title" onSubmit={submitPassword}>
      <header className={styles.header}>
        <div>
          <h2 id="password-title">Password</h2>
          <p>Use a strong password you don’t use anywhere else.</p>
        </div>
      </header>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="current-password">Current password</label>
        <div className={styles.passwordInputWrap}>
          <input id="current-password" type={visible.current ? "text" : "password"} className={styles.input} autoComplete="current-password" value={passwords.current}
            onChange={(event) => setPasswords((value) => ({ ...value, current: event.target.value }))} required />
          <button type="button" className={styles.passwordToggle} aria-label={visible.current ? "Hide current password" : "Show current password"}
            onClick={() => setVisible((value) => ({ ...value, current: !value.current }))}>
            {visible.current ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
          </button>
        </div>
      </div>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="new-password">New password</label>
          <div className={styles.passwordInputWrap}>
            <input id="new-password" type={visible.next ? "text" : "password"} className={styles.input} autoComplete="new-password" minLength={12} maxLength={256}
              value={passwords.next} onChange={(event) => setPasswords((value) => ({ ...value, next: event.target.value }))} required />
            <button type="button" className={styles.passwordToggle} aria-label={visible.next ? "Hide new password" : "Show new password"}
              onClick={() => setVisible((value) => ({ ...value, next: !value.next }))}>
              {visible.next ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="confirm-new-password">Confirm new password</label>
          <div className={styles.passwordInputWrap}>
            <input id="confirm-new-password" type={visible.confirm ? "text" : "password"} className={styles.input} autoComplete="new-password" minLength={12} maxLength={256}
              value={passwords.confirm} onChange={(event) => setPasswords((value) => ({ ...value, confirm: event.target.value }))} required />
            <button type="button" className={styles.passwordToggle} aria-label={visible.confirm ? "Hide password confirmation" : "Show password confirmation"}
              onClick={() => setVisible((value) => ({ ...value, confirm: !value.confirm }))}>
              {visible.confirm ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.passwordFoot}>
        <p>Choose a password with at least 12 characters.</p>
        <button type="submit" className={styles.button} disabled={isPending}>
          <KeyRound size={12} aria-hidden />{isPending ? "Updating…" : "Update Password"}
        </button>
      </div>
      {message && <p className={styles.formMessage} role="status">{message}</p>}
    </form>
  );
}
