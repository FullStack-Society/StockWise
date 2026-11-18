import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { normalizeRole, canViewUserList } from "@/lib/auth/roles";
import {
  listOrganizationMembers,
  listOrganizations,
} from "@/lib/api/organizations";
import UsersBrowser from "@/components/features/users/UsersBrowser";
import RolePermissions from "@/components/features/users/RolePermissions";
import StaffOrganizationActions from "@/components/features/users/organizations/StaffOrganizationActions";
import CreateOrganizationPanel from "@/components/features/users/organizations/CreateOrganizationPanel";
import styles from "@/styles/users/UsersPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Users" };

export default async function UsersPage() {
  const session = await requireSession();
  const role = normalizeRole(session.role);
  const organizations = await listOrganizations(session.email);
  const activeOrganization = organizations.find(
    (organization) => organization.organization_id === session.organizationId,
  );

  if (!session.organizationId || !activeOrganization) {
    return (
      <div className={`${styles.page} pageEnterUsers`}>
        <div className="pageEnterBlock"><header>
          <h1 className={styles.title}>No organization selected</h1>
          <p className={styles.subtitle}>
            Open the notification bell to accept an invitation, or ask an
            organization owner to invite this StockWise account.
          </p>
        </header></div>
        <div className="pageEnterBlock pageEnterDelay1"><CreateOrganizationPanel /></div>
      </div>
    );
  }

  if (!canViewUserList(role)) {
    return (
      <div className={`${styles.page} pageEnterUsers`}>
        <div className="pageEnterBlock"><header>
          <h1 className={styles.title}>Roles &amp; Permissions</h1>
          <p className={styles.subtitle}>
            See what each role can do in StockWise. Contact an Manager or the
            Owner to request changes.
          </p>
        </header></div>
        <div className="pageEnterBlock pageEnterDelay1"><StaffOrganizationActions
          organizationName={
            activeOrganization?.organization_name ?? "this organization"
          }
        /></div>
        <div className="pageEnterBlock pageEnterDelay2"><RolePermissions currentRole={role} hideHeading /></div>
      </div>
    );
  }

  const members = await listOrganizationMembers(
    session.organizationId,
    session.email,
  );
  return (
    <div className={`${styles.page} pageEnterUsers`}>
      <div className="pageEnterBlock"><UsersBrowser
        key={members
          .map(
            (member) =>
              `${member.email}:${member.role}:${member.status}:${member.joined_at ?? ""}`,
          )
          .join("|")}
        currentRole={role}
        currentUserId={session.email}
        organizationName={
          activeOrganization?.organization_name ?? "organization"
        }
        initialMembers={members}
      /></div>
      <div className="pageEnterBlock pageEnterDelay1"><RolePermissions currentRole={role} /></div>
    </div>
  );
}
