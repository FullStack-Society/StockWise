import type { PurchaseOrder } from "@/lib/api/orders";
import ReceiveOrderItem from "./ReceiveOrderItem";
import styles from "@/styles/orders/OrdersList.module.css";

export default function OrdersList({
  orders,
  emptyTitle,
  emptyDescription,
}: {
  orders: PurchaseOrder[];
  emptyTitle: string;
  emptyDescription: string;
}) {
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
              <h2>Order #{order.id}</h2>
              <p>
                <time
                  dateTime={order.createdAt}
                  suppressHydrationWarning
                >
                  {new Date(order.createdAt).toLocaleDateString()}
                </time>{" "}
                ·{" "}
                {order.createdByEmail}
              </p>
              {order.notes && <p className={styles.notes}>{order.notes}</p>}
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
              {order.status}
            </span>
          </header>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered</th>
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
