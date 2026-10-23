import type { Role } from "@/lib/auth/roles";
import styles from "@/styles/ui/RoleBadge.module.css";

export default function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`${styles.badge} ${styles[role.toLowerCase()]}`}>
      {role}
    </span>
  );
}
