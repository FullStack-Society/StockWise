import { Check } from "lucide-react";
import Logo from "@/components/ui/Logo";
import styles from "@/styles/login/BrandPanel.module.css";

const LOGIN_FEATURES = [
  "Feature placeholder 1",
  "Feature placeholder 2",
  "Feature placeholder 3",
];

export default function BrandPanel() {
  return (
    <section className={styles.brand}>
      <div className={styles.brandInner}>
        <Logo />

        <h1 className={styles.title}>Retail inventory, simplified</h1>

        <p className={styles.description}>Short description placeholder</p>

        <ul className={styles.features}>
          {LOGIN_FEATURES.map((feature) => (
            <li key={feature} className={styles.feature}>
              <span className={styles.featureCheck}>
                <Check size={11} strokeWidth={2} />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
