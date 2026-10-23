import { UserPlus } from "lucide-react";
import { assignableRoles, type Role } from "@/lib/auth/roles";
import styles from "@/styles/users/UsersHeader.module.css";

type Props = { currentRole: Role; onAdd: () => void };

export default function UsersHeader({ currentRole, onAdd }: Props) {
  const canAdd = assignableRoles(currentRole).length > 0;
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.subtitle}>
          Invite people to this account and control what each of them can do.
        </p>
      </div>
      {canAdd && (
        <button type="button" className={styles.primaryBtn} onClick={onAdd}>
          <UserPlus size={14} aria-hidden /> Add User
        </button>
      )}
    </header>
  );
}
