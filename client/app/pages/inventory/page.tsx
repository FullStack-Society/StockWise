import type { Metadata } from "next";
import InventoryHeader from "@/components/features/inventory/InventoryHeader";
import InventoryBrowser from "@/components/features/inventory/InventoryBrowser";
import InventoryStats from "@/components/features/inventory/InventoryStats";
import styles from "@/styles/inventory/InventoryPage.module.css";
import { requireSession } from "@/lib/auth/session";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Inventory" };

export default async function InventoryPage() {
  await requireSession();

  return (
    <div className={styles.page}>
      <InventoryHeader />
      <InventoryBrowser />
      <InventoryStats />
    </div>
  );
}
