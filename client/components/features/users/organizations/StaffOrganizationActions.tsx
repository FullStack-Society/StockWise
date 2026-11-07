"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import LeaveOrganizationButton from "./LeaveOrganizationButton";
import { leaveOrganizationAction } from "@/lib/organization/actions";
import styles from "@/styles/users/UsersBrowser.module.css";
import DestructiveConfirmationModal from "@/components/ui/DestructiveConfirmationModal";

export default function StaffOrganizationActions({
  organizationName,
}: {
  organizationName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  function leave() {
    startTransition(async () => {
      const result = await leaveOrganizationAction();
      setConfirmLeave(false);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <LeaveOrganizationButton
        onLeave={() => setConfirmLeave(true)}
        disabled={pending}
      />
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
      {confirmLeave && (
        <DestructiveConfirmationModal
          title="Leave organization?"
          description={`Leave ${organizationName}? You will lose access to its inventory.`}
          confirmLabel="Leave organization"
          isPending={pending}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={leave}
        />
      )}
    </div>
  );
}
