"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, Mail, UserRound } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { register, type RegisterState } from "@/lib/auth/actions";
import styles from "@/styles/login/LoginForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useActionState<RegisterState, FormData>(
    register,
    {},
  );

  return (
    <div className={styles.card}>
      <div className={styles.mobileBrand}>
        <Logo />
      </div>
      <h2 className={styles.cardTitle}>Create your StockWise account</h2>
      <p className={styles.cardSubtitle}>
        Set up your organization or accept a team invitation after signing up.
      </p>

      <form action={formAction} className={styles.form}>
        <label htmlFor="name" className={styles.label}>
          Full name
        </label>
        <div className={styles.field}>
          <UserRound size={12} />
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={160}
            defaultValue={state.name}
            required
            className={styles.input}
          />
        </div>

        <label htmlFor="email" className={styles.labelSpaced}>
          Email
        </label>
        <div className={styles.field}>
          <Mail size={12} />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.email}
            required
            className={styles.input}
          />
        </div>

        <label htmlFor="password" className={styles.labelSpaced}>
          Password
        </label>
        <div className={styles.field}>
          <Lock size={12} />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            className={styles.input}
          />
        </div>
        <p className={styles.fieldHint}>Use 12–128 characters.</p>

        <label htmlFor="confirm_password" className={styles.labelSpaced}>
          Confirm password
        </label>
        <div className={styles.field}>
          <Lock size={12} />
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            className={styles.input}
          />
        </div>

        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>

      <hr className={styles.divider} />
      <p className={styles.help}>
        Already have an account?{" "}
        <a className={styles.link} href="/login">
          Sign in
        </a>
      </p>
    </div>
  );
}
