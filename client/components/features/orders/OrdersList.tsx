import type { PurchaseOrder } from "@/lib/api/orders";
import ReceiveOrderItem from "./ReceiveOrderItem";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import { formatDateTime } from "@/lib/utils/format";
import { formatPreferredCurrency } from "@/lib/utils/format";
import { Pencil, Trash2 } from "lucide-react";
import styles from "@/styles/orders/OrdersList.module.css";

export default function OrdersList({
  orders,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDescription,
}: {
  orders: PurchaseOrder[];
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const {
    date_format: dateFormat,
    timezone,
    currency,
    currencyRates,
  } = useUserPreferences();
  if (orders.length === 0) {
    return (
      <section className={styles.empty}>
        <h2>{emptyTitle}</h2>
        <p>{emptyDescription}</p>
      </section>
    );
  }

  return (
    <div className={styles.list}>
      {orders.map((order) => (
        <section className={styles.card} key={order.id}>
          <header className={styles.header}>
            <div>
              <h2>Order #{order.orderNumber}</h2>
              <p>
                <time dateTime={order.createdAt}>
                  {formatDateTime(order.createdAt, dateFormat, timezone)}
                </time>{" "}
                · {order.createdByEmail}
              </p>
              {order.notes && <p className={styles.notes}>{order.notes}</p>}
              <p className={styles.orderValue}>
                Order value:{" "}
                {formatPreferredCurrency(
                  order.items.reduce(
                    (total, item) =>
                      total + item.unitPrice * item.quantityOrdered,
                    0,
                  ),
                  currency,
                  currencyRates,
                )}
              </p>
            </div>
            <span
              className={`${styles.status} ${
                order.status === "Received"
                  ? styles.statusDone
                  : order.status === "Partially received"
                    ? styles.statusPartial
                    : ""
              }`}
            >
              {order.status === "Received" ? "Done" : order.status}
            </span>

            <div className={styles.actions}>
              {order.status === "Open" && (
                <button
                  type="button"
                  className={styles.editOrder}
                  onClick={() => onEdit(order)}
                  aria-label={`Edit order ${order.orderNumber}`}
                >
                  <Pencil size={14} aria-hidden />
                  Edit order
                </button>
              )}

              <button
                type="button"
                className={styles.deleteOrder}
                onClick={() => onDelete(order)}
                aria-label={`Delete order ${order.orderNumber}`}
              >
                <Trash2 size={14} aria-hidden />
                Delete
              </button>
            </div>
          </header>
          <div className={`${styles.tableWrap} mobileTableScroll`}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered</th>
                  <th>Unit value</th>
                  <th>Line value</th>
                  <th>Received</th>
                  <th>Remaining</th>
                  <th>Receive delivery</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.productName}</strong>
                      <small>{item.sku}</small>
                    </td>
                    <td>{item.quantityOrdered}</td>
                    <td>
                      {formatPreferredCurrency(
                        item.unitPrice,
                        currency,
                        currencyRates,
                      )}
                    </td>
                    <td>
                      {formatPreferredCurrency(
                        item.unitPrice * item.quantityOrdered,
                        currency,
                        currencyRates,
                      )}
                    </td>
                    <td>{item.quantityReceived}</td>
                    <td>{item.quantityRemaining}</td>
                    <td>
                      <ReceiveOrderItem orderId={order.id} item={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
