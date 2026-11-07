import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import type { Product } from "@/lib/inventory/types";
import styles from "@/styles/dashboard/LowStockItems.module.css";

export default function LowStockItems({
  products,
  locationId,
}: {
  products: Product[];
  locationId: number;
}) {
  const items = products
    .filter((product) => product.status !== "in-stock")
    .sort((a, b) => {
      const severity = (product: Product) =>
        product.status === "out-of-stock" ? 0 : 1;
      return severity(a) - severity(b) || a.quantity - b.quantity;
    })
    .slice(0, 5);

  return (
    <section className={styles.panel} aria-labelledby="low-stock-title">
      <header className={styles.header}>
        <div>
          <h2 id="low-stock-title">Needs attention</h2>
          <p>Products at or below their reorder point.</p>
        </div>
        <Link href={`${ROUTES.inventory}?location=${locationId}`}>View location inventory</Link>
      </header>
      {items.length ? (
        <ul className={styles.list}>
          {items.map((product) => (
            <li key={product.id}>
              <Link href={`${ROUTES.inventory}?location=${locationId}&search=${encodeURIComponent(product.sku)}`}>
                <span className={styles.product}>
                  <strong>{product.name}</strong>
                  <small>{product.sku}</small>
                </span>
                <span className={styles.stock}>
                  <strong>{product.quantity}</strong>
                  <small>of {product.reorderPoint} reorder point</small>
                </span>
                <span className={product.quantity === 0 ? styles.critical : styles.low}>
                  {product.quantity === 0 ? "Out of stock" : "Low stock"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No products need attention at this location.</p>
      )}
    </section>
  );
}
