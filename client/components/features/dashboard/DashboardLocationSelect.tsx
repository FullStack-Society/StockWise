"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { InventoryLocation } from "@/lib/inventory/types";
import styles from "@/styles/dashboard/DashboardPage.module.css";

export default function DashboardLocationSelect({
  locations,
  selectedId,
}: {
  locations: InventoryLocation[];
  selectedId: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  return (
    <label className={styles.locationSelect}>
      <span>Inventory location</span>
      <select
        value={selectedId}
        onChange={(event) =>
          router.push(
            `/pages/dashboard?${new URLSearchParams({
              days: searchParams.get("days") ?? "7",
              location: event.target.value,
            })}`,
          )
        }
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </label>
  );
}
