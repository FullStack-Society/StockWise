"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import Logo from "@/components/ui/Logo";
import {
  register,
  resendRegistrationVerification,
  verifyRegistration,
  type RegisterState,
  type ResendRegistrationState,
} from "@/lib/auth/actions";
import styles from "@/styles/login/LoginForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "Sending code…" : "Continue with Gmail"}
    </button>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "Verifying…" : "Verify Gmail and create account"}
    </button>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.linkButton}>
      {pending ? "Sending…" : "Resend verification code"}
    </button>
  );
}

export default function RegisterForm({
  onSwitch,
  googleError = false,
}: {
  onSwitch?: () => void;
  googleError?: boolean;
}) {
  const [state, formAction] = useActionState<RegisterState, FormData>(
    register,
    {},
  );
  const [verifyState, verifyAction] = useActionState<RegisterState, FormData>(
    verifyRegistration,
    {},
  );
  const [resendState, resendAction] = useActionState<
    ResendRegistrationState,
    FormData
  >(resendRegistrationVerification, {});
  const [passwordVisible, setPasswordVisible] = useState({
    password: false,
    confirm: false,
  });

  return (
    <div className={`${styles.card} ${styles.registerCard}`}>
      <div className={styles.mobileBrand}>
        <Logo />
      </div>
      <h2 className={styles.cardTitle}>Create your StockWise account</h2>
      <p className={styles.cardSubtitle}>
        {state.verificationRequired
          ? `Enter the 8-digit code sent to ${state.email}. Your account is created after Gmail is verified.`
          : "Verify your Gmail address before creating your StockWise account."}
      </p>
      {googleError && (
        <p role="alert" className={styles.error}>
          Google sign-in did not complete. Please try again.
        </p>
      )}
      {state.verificationRequired ? (
        <>
          <form action={verifyAction} className={styles.form}>
            <input type="hidden" name="email" value={state.email ?? ""} />
            <label htmlFor="registration-code" className={styles.label}>
              Gmail verification code
            </label>
            <div className={styles.field}>
              <Mail size={12} />
              <input
                id="registration-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                maxLength={8}
                autoFocus
                required
                className={styles.input}
              />
            </div>
            <p className={styles.fieldHint}>The code expires in 10 minutes.</p>
            {verifyState.error && (
              <p role="alert" className={styles.error}>
                {verifyState.error}
              </p>
            )}
            <VerifyButton />
          </form>
          <form action={resendAction} className={styles.resendForm}>
            <input type="hidden" name="email" value={state.email ?? ""} />
            <ResendButton />
            {resendState.message && (
              <p role="status" className={styles.fieldHint}>
                {resendState.message}
              </p>
            )}
            {resendState.error && (
              <p role="alert" className={styles.error}>
                {resendState.error}
              </p>
            )}
          </form>
          <p className={styles.help}>
            <a className={styles.link} href="/register">
              Use a different Gmail address
            </a>
          </p>
        </>
      ) : (
        <form action={formAction} className={styles.form}>
          <div className={styles.nameFields}>
            <div className={styles.nameField}>
              <label htmlFor="first_name" className={styles.label}>
                First name
              </label>
              <div className={styles.field}>
                <UserRound size={12} />
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  maxLength={80}
                  defaultValue={state.firstName}
                  required
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.nameField}>
              <label htmlFor="last_name" className={styles.label}>
                Last name
              </label>
              <div className={styles.field}>
                <UserRound size={12} />
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  maxLength={80}
                  defaultValue={state.lastName}
                  required
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          <label htmlFor="email" className={styles.labelSpaced}>
            Gmail address
          </label>
          <div className={styles.field}>
            <Mail size={12} />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@gmail.com"
              pattern="[^@]+@(gmail\.com|googlemail\.com)"
              title="Use a Gmail address to register manually."
              autoComplete="email"
              defaultValue={state.email}
              required
              className={styles.input}
            />
          </div>

          <label htmlFor="password" className={styles.labelSpaced}>
            password
          </label>
          <div className={styles.field}>
            <Lock size={12} />
            <input
              id="password"
              name="password"
              type={passwordVisible.password ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,128}"
              title="Use at least 8 characters, including a capital letter and a special character."
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
              aria-label={
                passwordVisible.password ? "Hide password" : "Show password"
              }
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
            Use at least 8 characters, including a capital letter and a special
            character.
          </p>

          <label htmlFor="confirm_password" className={styles.labelSpaced}>
            Confirm password
          </label>
          <div className={styles.field}>
            <Lock size={12} />
            <input
              id="confirm_password"
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
              onClick={() =>
                setPasswordVisible((current) => ({
                  ...current,
                  confirm: !current.confirm,
                }))
              }
              aria-label={
                passwordVisible.confirm
                  ? "Hide password confirmation"
                  : "Show password confirmation"
              }
              aria-pressed={passwordVisible.confirm}
            >
              {passwordVisible.confirm ? (
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
      )}

      <div className={styles.orDivider}>
        <span>or</span>
      </div>
      <a
        href="/api/auth/google/start?mode=register"
        className={styles.googleButton}
      >
        <GoogleMark />
        Sign up with Google
      </a>
      <p className={styles.help}>
        Already have an account?{" "}
        <a
          className={styles.link}
          href="/login"
          onClick={(event) => {
            if (!onSwitch) return;
            event.preventDefault();
            onSwitch();
          }}
        >
          Sign in
        </a>
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.2 5.59c4.2-3.87 6.54-9.58 6.54-17.24Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.94-2.13 15.92-5.78l-7.2-5.59c-2 1.34-4.56 2.13-8.72 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z"
      />
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
    </svg>
  );
}
