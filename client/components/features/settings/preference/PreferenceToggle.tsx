import styles from "@/styles/settings/PreferencesPanel.module.css";

export default function PreferenceToggle({
  label,
  enabled = false,
  disabled = false,
  onChange,
}: {
  label: string;
  enabled?: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`${styles.switch} ${enabled ? styles.switchOn : ""}`}
    >
      <span className={styles.knob} />
    </button>
  );
}
