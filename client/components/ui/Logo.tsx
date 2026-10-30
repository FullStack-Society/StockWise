import styles from "@/styles/ui/Logo.module.css";

export default function Logo() {
  return (
    <div className={styles.logo}>
      <div className={styles.mark}>
        <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <rect
            x="1.5"
            y="1.5"
            width="37"
            height="37"
            rx="8"
            fill="#0b121a"
            stroke="currentColor"
          />
          <path
            d="M9 30.5h22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
          <rect x="9" y="22" width="5" height="7" fill="currentColor" />
          <rect
            x="17.5"
            y="17"
            width="5"
            height="12"
            fill="currentColor"
            opacity=".72"
          />
          <rect
            x="26"
            y="12"
            width="5"
            height="17"
            fill="currentColor"
            opacity=".48"
          />
          <path
            d="m9 16 7-4 5 2 10-7"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M27.5 7H31v3.5"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className={styles.name}>StockWise</span>
    </div>
  );
}
