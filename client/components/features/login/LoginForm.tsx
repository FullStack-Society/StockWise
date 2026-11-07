"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Logo from "@/components/ui/Logo";
import {
  login,
  verifySecondFactor,
  type LoginState,
  type TwoFactorLoginState,
} from "@/lib/auth/actions";
import styles from "@/styles/login/LoginForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "Verifying…" : "Verify and sign in"}
    </button>
  );
}

export default function LoginForm({
  onSwitch,
  googleError = false,
  twoFactorRequired = false,
}: {
  onSwitch?: () => void;
  googleError?: boolean;
  twoFactorRequired?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});
  const [mfaState, mfaAction] = useActionState<TwoFactorLoginState, FormData>(
    verifySecondFactor,
    {},
  );

  if (state.twoFactorRequired || twoFactorRequired) {
    return (
      <div className={styles.card}>
        <div className={styles.mobileBrand}><Logo /></div>
        <h2 className={styles.cardTitle}>Verify it’s you</h2>
        <p className={styles.cardSubtitle}>
          Enter the current code from your authenticator app. You can also use a recovery code.
        </p>
        <form action={mfaAction} className={styles.form}>
          {state.challengeToken && (
            <input type="hidden" name="challenge_token" value={state.challengeToken} />
          )}
          <input type="hidden" name="remember" value={state.remember ? "true" : "false"} />
          <label htmlFor="two-factor-code" className={styles.label}>Verification code</label>
          <div className={styles.field}>
            <input
              id="two-factor-code"
              name="code"
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              maxLength={32}
              required
              autoFocus
              className={styles.input}
            />
          </div>
          {mfaState.error && <p role="alert" className={styles.error}>{mfaState.error}</p>}
          <VerifyButton />
        </form>
        <p className={styles.help}><a className={styles.link} href="/login">Back to sign in</a></p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.mobileBrand}>
        <Logo />
      </div>
      <h2 className={styles.cardTitle}>Sign in</h2>
      <p className={styles.cardSubtitle}>Enter your credentials to continue</p>
      {googleError && (
        <p role="alert" className={styles.error}>
          Google sign-in did not complete. Please try again.
        </p>
      )}
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
            placeholder="email@gmail.com"
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
          <Link className={styles.link} href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <div className={styles.orDivider}><span>or</span></div>
      <a href="/api/auth/google/start?mode=login" className={styles.googleButton}>
        <GoogleMark />
        Sign in with Google
      </a>
      <p className={styles.help}>
        New to StockWise?{" "}
          <a
            className={styles.link}
            href="/register"
            onClick={(event) => {
              if (!onSwitch) return;
              event.preventDefault();
              onSwitch();
            }}
          >
          Create an account
        </a>
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.2 5.59c4.2-3.87 6.54-9.58 6.54-17.24Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.94-2.13 15.92-5.78l-7.2-5.59c-2 1.34-4.56 2.13-8.72 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" />
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
    </svg>
  );
}
