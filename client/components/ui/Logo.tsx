import styles from "@/styles/ui/Logo.module.css";

export default function Logo() {
  return (
    <div className={styles.logo}>
      <div className={styles.mark}>LOGO</div>
      <span className={styles.name}>StockWise</span>
    </div>
  );
}
