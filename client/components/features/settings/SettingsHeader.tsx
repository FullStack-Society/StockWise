import styles from "@/styles/settings/SettingsHeader.module.css";

export default function SettingsHeader() {
  return (
    <header>
      <h1 className={styles.title}>Account Settings</h1>
      <p className={styles.subtitle}>
        Manage your profile information, account security, and preferences.
      </p>
    </header>
  );
}
