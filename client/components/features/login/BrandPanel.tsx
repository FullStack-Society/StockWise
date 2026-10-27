import { Check } from "lucide-react";
import Logo from "@/components/ui/Logo";
import styles from "@/styles/login/BrandPanel.module.css";

const LOGIN_FEATURES = [
  "See in-stock, low-stock, and out-of-stock products",
  "Import a product catalog from CSV",
  "Review inventory value and recorded stock movement",
  "Manage team access with clear roles",
];

const REGISTER_FEATURES = [
  "Set up products and categories in one catalog",
  "Bring in existing products with CSV import",
  "Spot low-stock items sooner",
  "Invite teammates as admins or staff",
];

export default function BrandPanel({
  variant = "login",
}: {
  variant?: "login" | "register";
}) {
  const isRegister = variant === "register";
  const features = isRegister ? REGISTER_FEATURES : LOGIN_FEATURES;

  return (
    <section className={styles.brand}>
      <div className={styles.brandInner}>
        <Logo />

        <p className={styles.eyebrow}>
          {isRegister
            ? "GET STARTED WITH STOCKWISE"
            : "INVENTORY MANAGEMENT FOR RETAIL"}
        </p>
        <h1 className={styles.title}>
          {isRegister
            ? "Build a clearer picture of your stock."
            : "Know what’s in stock. Plan what’s next."}
        </h1>

        <p className={styles.description}>
          {isRegister
            ? "Create an account to set up your organization or join one by invitation. Keep your products, stock status, and team access together."
            : "Keep your product catalog, stock status, team access, and inventory reports together in one workspace."}
        </p>

        <ul className={styles.features}>
          {features.map((feature) => (
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
