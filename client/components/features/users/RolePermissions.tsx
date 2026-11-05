import { Check, Minus, X } from "lucide-react";
import RoleBadge from "@/components/ui/RoleBadge";
import {
  PERMISSIONS,
  ROLES,
  ROLE_INFO,
  type Access,
  type Role,
} from "@/lib/auth/roles";
import styles from "@/styles/users/RolePermissions.module.css";

function Cell({ access }: { access: Access }) {
  if (access === "full")
    return (
      <span className={styles.accFull}>
        <Check size={13} aria-hidden /> Full
      </span>
    );
  if (access === "limited")
    return (
      <span className={styles.accLimited}>
        <Minus size={13} aria-hidden /> Limited
      </span>
    );
  return (
    <span className={styles.accNone}>
      <X size={13} aria-hidden /> No access
    </span>
  );
}

type Props = { currentRole?: Role; hideHeading?: boolean };

export default function RolePermissions({
  currentRole,
  hideHeading = false,
}: Props) {
  return (
    <section className={styles.listPanel}>
      {!hideHeading && (
        <div className={styles.permHead}>
          <h2 className={styles.panelTitle}>Roles &amp; Permissions</h2>
          <p className={styles.subtitle}>What each role can do in StockWise.</p>
        </div>
      )}

      <div className={styles.roleCards}>
        {ROLES.map((r) => (
          <div
            key={r}
            className={`${styles.roleCard} ${r === currentRole ? styles.roleCardYou : ""}`}
          >
            <div className={styles.roleCardTop}>
              <RoleBadge role={r} />
              {r === currentRole && (
                <span className={styles.youTag}>Your role</span>
              )}
            </div>
            <p className={styles.roleCardText}>{ROLE_INFO[r].summary}</p>
          </div>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Permission</th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  className={r === currentRole ? styles.colYou : undefined}
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.label}
                  {p.note && <div className={styles.userEmail}>{p.note}</div>}
                </td>
                {ROLES.map((r) => (
                  <td
                    key={r}
                    className={r === currentRole ? styles.colYou : undefined}
                  >
                    <Cell access={p[r]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
