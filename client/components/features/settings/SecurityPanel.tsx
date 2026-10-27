import { KeyRound, ShieldCheck } from "lucide-react";
import styles from "@/styles/settings/SecurityPanel.module.css";

export default function SecurityPanel() {
  const passwordEnabled = true;
  const twoFactorEnabled = false;
  const securityScore = Math.round(
    ((Number(passwordEnabled) + Number(twoFactorEnabled)) / 2) * 100,
  );

  return (
    <section className={styles.panel} aria-labelledby="security-title">
      <header className={styles.header}>
        <h2 id="security-title">Security</h2>
        <p>Review the sign-in protections available for your StockWise account.</p>
      </header>

      <div className={styles.scoreCard}>
        <div className={styles.scoreHead}>
          <div>
            <h3>Account security score</h3>
            <p>Based on the sign-in protections currently available in StockWise.</p>
          </div>
          <strong className={styles.scoreValue}>{securityScore}%</strong>
        </div>
        <div
          className={styles.scoreTrack}
          role="progressbar"
          aria-label="Account security setup score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={securityScore}
        >
          <span style={{ width: `${securityScore}%` }} />
        </div>
        <p className={styles.scoreHint}>
          Password sign-in is enabled. Two-factor authentication is not set up, so this score is a setup checklist—not a guarantee that the account is secure.
        </p>
      </div>

      <div className={styles.item}>
        <div className={styles.icon} aria-hidden><KeyRound size={17} /></div>
        <div className={styles.content}>
          <h3>Password sign-in</h3>
          <p>Your account uses your email address and password to sign in. Use a unique password and keep it private.</p>
        </div>
        <span className={styles.enabled}>Enabled</span>
      </div>

      <div className={styles.item}>
        <div className={styles.icon} aria-hidden><ShieldCheck size={17} /></div>
        <div className={styles.content}>
          <h3>Two-factor authentication</h3>
          <p>An additional verification step is not configured for this account yet.</p>
        </div>
        <span className={styles.unavailable}>Not set up</span>
      </div>

      <p className={styles.note}>
        Two-factor setup and password changes aren’t available in StockWise yet. Your sign-in details remain managed by your account credentials.
      </p>
    </section>
  );
}
