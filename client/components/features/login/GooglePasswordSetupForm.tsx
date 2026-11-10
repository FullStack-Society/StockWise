"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { completeGoogleRegistration } from "@/lib/auth/actions";
import styles from "@/styles/login/LoginForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "Creating account…" : "Create StockWise password"}
    </button>
  );
}

export default function GooglePasswordSetupForm() {
  const [state, action] = useActionState(completeGoogleRegistration, {});
  const [passwordVisible, setPasswordVisible] = useState({
    password: false,
    confirmation: false,
  });
  return (
    <div className={styles.card}>
      <div className={styles.mobileBrand}>
        <Logo />
      </div>
      <h2 className={styles.cardTitle}>Create your StockWise password</h2>
      <p className={styles.cardSubtitle}>
        Your Google account is verified. Create a separate StockWise password
        so you can sign in with your email and password too.
      </p>
      <form action={action} className={styles.form}>
        <label htmlFor="password" className={styles.label}>
          StockWise password
        </label>
        <div className={styles.field}>
          <Lock size={12} />
          <input
            id="password"
            name="password"
            type={passwordVisible.password ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,128}"
            title="Use at least 12 characters, including a capital letter and a special character."
            required
            className={styles.input}
          />
          <button
            type="button"
            className={styles.iconButton}
            onClick={() =>
              setPasswordVisible((current) => ({
                ...current,
                password: !current.password,
              }))
            }
            aria-label={passwordVisible.password ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible.password}
          >
            {passwordVisible.password ? (
              <EyeOff size={14} aria-hidden />
            ) : (
              <Eye size={14} aria-hidden />
            )}
          </button>
        </div>
        <p className={styles.fieldHint}>
          Use at least 12 characters, including a capital letter and a special
          character. This is not your Google password.
        </p>
        <label htmlFor="confirm_password" className={styles.labelSpaced}>
          Confirm StockWise password
        </label>
        <div className={styles.field}>
          <Lock size={12} />
          <input
            id="confirm_password"
            name="confirm_password"
            type={passwordVisible.confirmation ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            className={styles.input}
          />
          <button
            type="button"
            className={styles.iconButton}
            onClick={() =>
              setPasswordVisible((current) => ({
                ...current,
                confirmation: !current.confirmation,
              }))
            }
            aria-label={
              passwordVisible.confirmation
                ? "Hide password confirmation"
                : "Show password confirmation"
            }
            aria-pressed={passwordVisible.confirmation}
          >
            {passwordVisible.confirmation ? (
              <EyeOff size={14} aria-hidden />
            ) : (
              <Eye size={14} aria-hidden />
            )}
          </button>
        </div>
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>
      <p className={styles.help}>
        <a className={styles.link} href="/api/auth/google/start?mode=register">
          Start again with Google
        </a>
      </p>
    </div>
  );
}
