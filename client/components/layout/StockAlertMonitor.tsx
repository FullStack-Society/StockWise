"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getStockAlertSnapshot } from "@/lib/inventory/actions";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";

type AlertProduct = Awaited<
  ReturnType<typeof getStockAlertSnapshot>
>["products"][number];

function alertKey(product: AlertProduct) {
  return `${product.locationId}:${product.id}`;
}

export default function StockAlertMonitor({
  organizationId,
}: {
  organizationId: number | null;
}) {
  const { desktopStockAlertsEnabled } = useUserPreferences();
  const router = useRouter();
  const baseline = useRef<Map<string, AlertProduct> | null>(null);
  const currentOrganization = useRef<number | null>(organizationId);

  useEffect(() => {
    if (currentOrganization.current !== organizationId) {
      currentOrganization.current = organizationId;
      baseline.current = null;
    }
    if (
      !organizationId ||
      !desktopStockAlertsEnabled ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      baseline.current = null;
      return;
    }

    let active = true;
    let inFlight = false;
    const checkStock = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const snapshot = await getStockAlertSnapshot();
        if (!active || snapshot.organizationId !== organizationId) return;
        const next = new Map(
          snapshot.products.map((product) => [alertKey(product), product]),
        );
        const previous = baseline.current;
        if (previous) {
          for (const [key, product] of next) {
            const old = previous.get(key);
            if (old && old.status === product.status) continue;
            // A transition from critical back to low stock is recovery, not a new alert.
            if (
              old?.status === "out-of-stock" &&
              product.status === "low-stock"
            )
              continue;
            const critical = product.status === "out-of-stock";
            const notification = new Notification(
              critical ? "Critical stock" : "Low stock",
              {
                body: `${product.name}${product.sku ? ` (${product.sku})` : ""} at ${product.locationName}: ${product.quantity} remaining${critical ? "." : ` (reorder at ${product.reorderPoint}).`}`,
                tag: `stockwise:${organizationId}:${key}:${product.status}`,
              },
            );
            notification.onclick = () => {
              window.focus();
              router.push("/pages/inventory");
              notification.close();
            };
          }
        }
        baseline.current = next;
      } catch {
        // Temporary network or session failures are retried at the next interval.
      } finally {
        inFlight = false;
      }
    };

    void checkStock();
    const timer = window.setInterval(() => void checkStock(), 30_000);
    document.addEventListener("visibilitychange", checkStock);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkStock);
    };
  }, [desktopStockAlertsEnabled, organizationId, router]);

  return null;
}
