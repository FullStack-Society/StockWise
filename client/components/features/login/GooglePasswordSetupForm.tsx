"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <div className={styles.card}>
      <div className={styles.mobileBrand}>
        <Logo />
      </div>
      <h2 className={styles.cardTitle}>Create your StockWise password</h2>
      <p className={styles.cardSubtitle}>
        Your Google account is verified. Create a separate StockWise password so
        you can sign in with your email and password too.
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
            type={passwordVisible ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}"
            title="Use at least 8 characters, including a capital letter and a special character."
            required
            className={styles.input}
          />
        </div>
        <p className={styles.fieldHint}>
          Use at least 8 characters, including a capital letter and a special
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
            type={passwordVisible ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            className={styles.input}
          />
        </div>
        <label className={styles.passwordVisibility}>
          <input
            type="checkbox"
            checked={passwordVisible}
            onChange={(event) => setPasswordVisible(event.target.checked)}
            className={styles.checkbox}
          />
          Show both passwords
        </label>
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>
      <p className={styles.help}>
        <a className={styles.link} href="/login">
          Back to sign in
        </a>
      </p>
    </div>
  );
}
