"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import LeaveOrganizationButton from "./LeaveOrganizationButton";
import { leaveOrganizationAction } from "@/lib/organization/actions";
import styles from "@/styles/users/UsersBrowser.module.css";

export default function StaffOrganizationActions({
  organizationName,
}: {
  organizationName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function leave() {
    if (
      !window.confirm(
        `Leave ${organizationName}? You will lose access to its inventory.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await leaveOrganizationAction();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <LeaveOrganizationButton onLeave={leave} disabled={pending} />
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
