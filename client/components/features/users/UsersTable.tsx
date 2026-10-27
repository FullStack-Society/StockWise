import { Trash2, Lock } from "lucide-react";
import RoleBadge from "@/components/ui/RoleBadge";
import {
  assignableRoles,
  canChangeRole,
  canManageUser,
  type Role,
} from "@/lib/auth/roles";
import type { TeamUser } from "@/lib/users/types";
import styles from "@/styles/users/UsersTable.module.css";

type Props = {
  users: TeamUser[];
  total: number;
  currentRole: Role;
  currentUserId: string;
  onRemove: (id: string) => void;
  onChangeRole: (id: string, role: Role) => void;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function UsersTable({
  users,
  total,
  currentRole,
  currentUserId,
  onRemove,
  onChangeRole,
}: Props) {
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th className={styles.alignRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No users match your filters.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const manageable = !isSelf && canManageUser(currentRole, u.role);
              const roleEditable =
                !isSelf && canChangeRole(currentRole, u.role);
              return (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.avatar} aria-hidden>
                        {initials(u.name)}
                      </span>
                      <div>
                        <div className={styles.userName}>
                          {u.name}
                          {isSelf && <span className={styles.youTag}>You</span>}
                        </div>
                        <div className={styles.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {roleEditable ? (
                      <select
                        className={styles.roleSelect}
                        value={u.role}
                        aria-label={`Role for ${u.name}`}
                        onChange={(e) =>
                          onChangeRole(u.id, e.target.value as Role)
                        }
                      >
                        {assignableRoles(currentRole).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <RoleBadge role={u.role} />
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        u.status === "Active"
                          ? styles.statusActive
                          : styles.statusInvited
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className={styles.muted}>{u.joinedAt}</td>
                  <td className={styles.alignRight}>
                    {manageable ? (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => onRemove(u.id)}
                        aria-label={`Remove ${u.name}`}
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    ) : (
                      <span
                        className={styles.locked}
                        title="You don't have permission to change this user"
                      >
                        <Lock size={12} aria-hidden />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        Showing {users.length} of {total} users
      </div>
    </>
  );
}
