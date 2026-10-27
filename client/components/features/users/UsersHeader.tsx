import { UserPlus } from "lucide-react";
import { assignableRoles, type Role } from "@/lib/auth/roles";
import LeaveOrganizationButton from "./LeaveOrganizationButton";
import styles from "@/styles/users/UsersHeader.module.css";

type Props = {
  currentRole: Role;
  organizationName: string;
  onAdd: () => void;
  onLeave: () => void;
  pending: boolean;
};

export default function UsersHeader({
  currentRole,
  organizationName,
  onAdd,
  onLeave,
  pending,
}: Props) {
  const canAdd = assignableRoles(currentRole).length > 0;
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.subtitle}>
          Manage members and invitations for {organizationName}.
        </p>
      </div>
      <div className={styles.actions}>
        {currentRole !== "owner" && (
          <LeaveOrganizationButton onLeave={onLeave} disabled={pending} />
        )}
        {canAdd && (
          <button type="button" className={styles.primaryBtn} onClick={onAdd}>
            <UserPlus size={14} aria-hidden /> Invite user
          </button>
        )}
      </div>
    </header>
  );
}
