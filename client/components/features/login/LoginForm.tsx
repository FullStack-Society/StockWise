"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { login, type LoginState } from "@/lib/auth/actions";
import styles from "@/styles/login/LoginForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <div className={styles.card}>
      <div className={styles.mobileBrand}>
        <Logo />
      </div>
      <h2 className={styles.cardTitle}>Sign in</h2>
      <p className={styles.cardSubtitle}>Enter your credentials to continue</p>

      <form action={formAction} className={styles.form}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <div className={styles.field}>
          <Mail size={12} />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@company.com"
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
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className={styles.input}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={styles.iconButton}
          >
            {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>

        <div className={styles.row}>
          <label className={styles.remember}>
            <input
              type="checkbox"
              name="remember"
              className={styles.checkbox}
            />
            Remember me
          </label>
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
        New to StockWise?{" "}
        <a className={styles.link} href="/register">
          Create an account
        </a>
      </p>
    </div>
  );
}
