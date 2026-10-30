import { Pencil, Trash2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatPreferredCurrency } from "@/lib/utils/format";
import { useUserPreferences } from "@/components/layout/UserPreferencesProvider";
import type { Product, StockStatus } from "@/lib/inventory/types";
import styles from "@/styles/inventory/InventoryTable.module.css";

const QTY_CLASS: Record<StockStatus, string> = {
  "in-stock": "",
  "low-stock": styles.qtyLow,
  "out-of-stock": styles.qtyCritical,
};

type Props = {
  rows: Product[];
  selected: Set<number>;
  allProductIds: number[];
  emptyMessage: string;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function InventoryTable({
  rows,
  selected,
  allProductIds,
  emptyMessage,
  onToggle,
  onToggleAll,
  onEdit,
  onDelete,
}: Props) {
  const { currency, currencyRates } = useUserPreferences();
  const allSelected =
    allProductIds.length > 0 &&
    allProductIds.every((id) => selected.has(id));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th className={styles.checkCell}>
              <input
                type="checkbox"
                aria-label="Select all products"
                checked={allSelected}
                onChange={onToggleAll}
                className={styles.checkbox}
              />
            </th>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Unit price ({currency})</th>
            <th>Status</th>
            <th className={styles.alignRight}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          )}

          {rows.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <tr
                key={p.id}
                className={isSelected ? styles.rowSelected : undefined}
              >
                <td className={styles.checkCell}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    checked={isSelected}
                    onChange={() => onToggle(p.id)}
                    className={styles.checkbox}
                  />
                </td>
                <td>
                  <div className={styles.product}>
                    <span className={styles.thumb} aria-hidden />
                    {p.name}
                  </div>
                </td>
                <td>{p.sku}</td>
                <td>{p.categoryName ?? "Uncategorized"}</td>
                <td className={`${styles.qty} ${QTY_CLASS[p.status]}`}>
                  {p.quantity}
                </td>
                <td>
                  {formatPreferredCurrency(p.price, currency, currencyRates)}
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td className={styles.alignRight}>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => onEdit(p)}
                      className={styles.iconButton}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => onDelete(p)}
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
