"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Mail } from "lucide-react";
import { requestPasswordReset, type ForgotPasswordState } from "@/lib/auth/actions";
import Logo from "@/components/ui/Logo";
import styles from "@/styles/login/LoginForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <div className={styles.card}>
      <div className={styles.mobileBrand}><Logo /></div>
      <h2 className={styles.cardTitle}>Forgot password?</h2>
      <p className={styles.cardSubtitle}>
        Enter your account email and we’ll send a reset link if it matches.
      </p>
      {state.message && <p role="status" className={styles.success}>{state.message}</p>}
      <form action={formAction} className={styles.form}>
          <label htmlFor="reset-email" className={styles.label}>Email</label>
          <div className={styles.field}>
            <Mail size={14} aria-hidden />
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={state.email}
              required
              className={styles.input}
            />
          </div>
          {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
          <SubmitButton />
      </form>
      <p className={styles.help}>
        <Link className={styles.link} href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
