import styles from "@/styles/layout/PageLoading.module.css";

export default function PagesLoading() {
  return (
    <div className={styles.page} role="status" aria-busy="true">
      <span className={styles.screenReaderOnly}>Loading page content...</span>
      <div className={`${styles.line} ${styles.heading}`} aria-hidden="true" />
      <div className={`${styles.line} ${styles.subtitle}`} aria-hidden="true" />
      <div className={styles.stats} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className={styles.stat} key={index}>
            <div className={`${styles.line} ${styles.statLabel}`} />
            <div className={`${styles.line} ${styles.statValue}`} />
          </div>
        ))}
      </div>
      <div className={styles.panels} aria-hidden="true">
        <div className={styles.panel}>
          <div className={`${styles.line} ${styles.panelTitle}`} />
          <div className={styles.rows}>
            {Array.from({ length: 5 }, (_, index) => (
              <div className={styles.row} key={index}>
                <div className={`${styles.line} ${styles.rowPrimary}`} />
                <div className={`${styles.line} ${styles.rowSecondary}`} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.panel}>
          <div className={`${styles.line} ${styles.panelTitle}`} />
          <div className={styles.chart} />
        </div>
      </div>
    </div>
  );
}
