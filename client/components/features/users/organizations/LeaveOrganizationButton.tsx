"use client";

import { LogOut } from "lucide-react";
import styles from "@/styles/users/UsersHeader.module.css";

export default function LeaveOrganizationButton({
  onLeave,
  disabled,
}: {
  onLeave: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.leaveBtn}
      onClick={onLeave}
      disabled={disabled}
    >
      <LogOut size={14} aria-hidden /> Leave organization
    </button>
  );
}
