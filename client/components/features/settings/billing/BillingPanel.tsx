import {
  ArrowDownToLine,
  Building2,
  CreditCard,
  FileText,
  Package,
  Users,
} from "lucide-react";
import styles from "@/styles/settings/BillingPanel.module.css";
import { PLANS } from "./types";

export default function BillingPanel() {
  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-labelledby="billing-title">
        <h2 id="billing-title" className={styles.title}>
          Current Plan
        </h2>
        <p className={styles.text}>
          Your subscription details will appear here when billing is connected.
        </p>
        <div className={styles.currentPlan}>
          <div className={styles.planSummary}>
            <div>
              <span className={styles.overline}>Subscription status</span>
              <h3>Not configured</h3>
            </div>
            <span className={styles.statusBadge}>Unavailable</span>
          </div>
          <div className={styles.planPrice}>
            <strong>—</strong>
            <span>Billing is not connected</span>
          </div>
          <div className={styles.metrics}>
            <div>
              <Users size={13} aria-hidden />
              <span>Team members</span>
              <strong>Not available</strong>
            </div>
            <div>
              <Package size={13} aria-hidden />
              <span>Inventory items</span>
              <strong>Not available</strong>
            </div>
            <div>
              <Building2 size={13} aria-hidden />
              <span>Storage use</span>
              <strong>Not reported</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="plans-title">
        <h2 id="plans-title" className={styles.title}>
          Available Plans
        </h2>
        <p className={styles.text}>
          Plan options are shown as a preview. No plan can be selected or
          purchased yet.
        </p>
        <div className={styles.planGrid}>
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`${styles.planCard} ${plan.featured ? styles.featuredPlan : ""}`}
            >
              <span className={styles.overline}>Plan preview</span>
              <h3>{plan.name}</h3>
              <p>{plan.detail}</p>
              <strong className={styles.planUnavailable}>
                Pricing unavailable
              </strong>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button type="button" className={styles.button} disabled>
                Unavailable
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="payment-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="payment-title" className={styles.title}>
              Payment Method
            </h2>
            <p className={styles.text}>
              A payment method has not been configured.
            </p>
          </div>
          <button type="button" className={styles.button} disabled>
            <CreditCard size={12} aria-hidden /> Add payment method
          </button>
        </div>
        <div className={styles.emptyState}>
          <CreditCard size={16} aria-hidden />
          <span>No payment methods on file.</span>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="billing-info-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="billing-info-title" className={styles.title}>
              Billing Information
            </h2>
            <p className={styles.text}>
              Billing details aren’t collected because subscription billing is
              not connected.
            </p>
          </div>
          <span className={styles.statusBadge}>Unavailable</span>
        </div>
        <div className={styles.billingGrid}>
          <label>
            <span>Company name</span>
            <input disabled placeholder="Not configured" />
          </label>
          <label>
            <span>Billing email</span>
            <input disabled placeholder="Not configured" />
          </label>
          <label className={styles.fullRow}>
            <span>Billing address</span>
            <textarea disabled placeholder="Not configured" />
          </label>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="history-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="history-title" className={styles.title}>
              Billing History
            </h2>
            <p className={styles.text}>
              Invoices and receipts for your records.
            </p>
          </div>
          <FileText size={15} aria-hidden className={styles.mutedIcon} />
        </div>
        <div className={styles.historyWrap}>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Receipt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>
                  <ArrowDownToLine size={14} aria-hidden />
                  Billing history will appear when billing is available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
