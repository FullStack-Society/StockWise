"use client";

import { useEffect } from "react";
import { heartbeatOrganizationPresenceAction } from "@/lib/organization/actions";

export default function PresenceHeartbeat({
  organizationId,
}: {
  organizationId: number | null;
}) {
  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    let inFlight = false;
    const heartbeat = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        await heartbeatOrganizationPresenceAction();
      } catch {
        // A missed heartbeat simply lets this member's presence expire to Offline.
      } finally {
        inFlight = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void heartbeat();
    };
    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), 30_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [organizationId]);

  return null;
}
