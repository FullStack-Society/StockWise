import {
  listOrganizations,
  listPendingInvitations,
  type InvitationNotice,
  type OrganizationSummary,
} from "@/lib/api/organizations";
import { getSession } from "@/lib/auth/session";
import styles from "@/styles/layout/TopBar.module.css";
import MobileNavigation from "./MobileNavigation";
import TopBarControls from "./TopBarControls";
import TopBarSearch from "./TopBarSearch";

export default async function Topbar({
  invitationsEnabled,
}: {
  invitationsEnabled: boolean;
}) {
  const user = await getSession();
  let organizations: OrganizationSummary[] = [];
  let invitations: InvitationNotice[] = [];

  if (user?.email) {
    try {
      [organizations, invitations] = await Promise.all([
        listOrganizations(user.email),
        listPendingInvitations(user.email),
      ]);
    } catch (error) {
      console.error(
        "[StockWise] Unable to load organization notifications:",
        error,
      );
    }
  }

  return (
    <header className={styles.topbar}>
      <MobileNavigation />
      <TopBarSearch
        role={
          organizations.find(
            (organization) =>
              organization.organization_id === user?.organizationId,
          )?.role ?? user?.role ?? null
        }
      />

      <TopBarControls
        user={user}
        organizations={organizations}
        invitations={invitations}
        invitationsEnabled={invitationsEnabled}
      />
    </header>
  );
}
