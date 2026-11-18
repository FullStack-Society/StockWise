"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  getUsageAnalyticsConsent,
  recordUsageAnalyticsPageView,
} from "@/lib/settings/actions";
import type { UsageAnalyticsPage } from "@/lib/api/reports";

function pageKey(pathname: string): UsageAnalyticsPage | null {
  const path = pathname.split("?")[0];
  if (path.startsWith("/pages/dashboard")) return "dashboard";
  if (path.startsWith("/pages/inventory")) return "inventory";
  if (path.startsWith("/pages/orders")) return "orders";
  if (path.startsWith("/pages/reports")) return "reports";
  if (path.startsWith("/pages/settings")) return "settings";
  if (path.startsWith("/pages/users")) return "users";
  return null;
}

export default function UsageAnalyticsTracker({
  organizationId,
}: {
  organizationId: number | null;
}) {
  const pathname = usePathname();
  const lastTracked = useRef("");

  useEffect(() => {
    const page = pageKey(pathname);
    if (!organizationId || !page) return;
    const visitKey = `${organizationId}:${pathname}`;
    if (lastTracked.current === visitKey) return;
    lastTracked.current = visitKey;

    void (async () => {
      try {
        const consent = await getUsageAnalyticsConsent();
        if (consent.enabled) await recordUsageAnalyticsPageView(page);
      } catch {
        // Analytics is optional and must never affect normal app navigation.
      }
    })();
  }, [organizationId, pathname]);

  return null;
}
