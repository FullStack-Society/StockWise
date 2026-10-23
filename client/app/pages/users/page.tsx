import type { Metadata } from "next";
import { requireSession, getSession } from "@/lib/auth/session";
import { normalizeRole, canViewUserList } from "@/lib/auth/roles";
import UsersBrowser from "@/components/features/users/UsersBrowser";
import RolePermissions from "@/components/features/users/RolePermissions";
import styles from "@/styles/users/UsersPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Users" };

export default async function UsersPage() {
  await requireSession();
  const session = await getSession();
  const role = normalizeRole(session?.role);

  // Staff can open this tab but only see the roles and what each one can do.
  // The user list (names, emails) is never sent to them.
  if (!canViewUserList(role)) {
    return (
      <div className={styles.page}>
        <header>
          <h1 className={styles.title}>Roles &amp; Permissions</h1>
          <p className={styles.subtitle}>
            See what each role can do in StockWise. Contact an Admin or the
            Owner to request changes.
          </p>
        </header>
        <RolePermissions currentRole={role} hideHeading />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <UsersBrowser
        currentRole={role}
        currentUserId={String(session?.id ?? "")}
      />
      <RolePermissions currentRole={role} />
    </div>
  );
}
