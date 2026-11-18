"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";
import { submitPasswordReset, type ResetPasswordState } from "@/lib/auth/actions";
import styles from "@/styles/login/LoginForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? "Saving password…" : "Set new password"}
    </button>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const [passwordVisible, setPasswordVisible] = useState({ new: false, confirm: false });
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(
    submitPasswordReset,
    {},
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Create a new password</h2>
      {state.success ? (
        <>
          <p role="status" className={styles.success}>Your password has been updated.</p>
          <p className={styles.help}><Link className={styles.link} href="/login">Back to sign in</Link></p>
        </>
      ) : !token ? (
        <>
          <p className={styles.error}>This reset link is missing or invalid. Request a new one.</p>
          <p className={styles.help}><Link className={styles.link} href="/forgot-password">Request another link</Link></p>
        </>
      ) : (
        <>
        <form action={formAction} className={styles.form}>
          <input type="hidden" name="token" value={token} />
          <label htmlFor="new-password" className={styles.label}>New password</label>
          <div className={styles.field}>
            <Lock size={14} aria-hidden />
            <input
              id="new-password"
              name="password"
              type={passwordVisible.new ? "text" : "password"}
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
              aria-label={passwordVisible.new ? "Hide new password" : "Show new password"}
              onClick={() => setPasswordVisible((value) => ({ ...value, new: !value.new }))}
            >
              {passwordVisible.new ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
          <label htmlFor="confirm-new-password" className={styles.labelSpaced}>Confirm new password</label>
          <div className={styles.field}>
            <Lock size={14} aria-hidden />
            <input
              id="confirm-new-password"
              name="confirm_password"
              type={passwordVisible.confirm ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              className={styles.input}
            />
            <button
              type="button"
              className={styles.iconButton}
              aria-label={passwordVisible.confirm ? "Hide password confirmation" : "Show password confirmation"}
              onClick={() => setPasswordVisible((value) => ({ ...value, confirm: !value.confirm }))}
            >
              {passwordVisible.confirm ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
          <p className={styles.fieldHint}>Use at least 12 characters, including a capital letter and a special character.</p>
          {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
          <SubmitButton />
        </form>
        {state.error && <p className={styles.help}><Link className={styles.link} href="/forgot-password">Request another link</Link></p>}
        </>
      )}
    </div>
  );
}
