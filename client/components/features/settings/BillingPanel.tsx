import styles from "@/styles/settings/BillingPanel.module.css";

export default function BillingPanel() {
  return (
    <section
      id="billing"
      className={styles.card}
      aria-labelledby="billing-title"
    >
      <h2 id="billing-title" className={styles.title}>
        Billing &amp; Subscription
      </h2>
      <p className={styles.text}>
        Subscription management is not connected yet. There is no active plan or
        billing method to manage.
      </p>
      <div className={styles.status}>
        <span>Plan status</span>
        <strong>Not configured</strong>
      </div>
    </section>
  );
}
