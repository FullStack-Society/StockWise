import {
  listOrganizations,
  listPendingInvitations,
  type InvitationNotice,
  type OrganizationSummary,
} from "@/lib/api/organizations";
import { getAccountSettings } from "@/lib/api/settings";
import { getSession } from "@/lib/auth/session";
import styles from "@/styles/layout/TopBar.module.css";
import MobileNavigation from "./MobileNavigation";
import TopBarControls from "./TopBarControls";
import TopBarSearch from "./TopBarSearch";

export default async function Topbar() {
  const user = await getSession();
  let organizations: OrganizationSummary[] = [];
  let invitations: InvitationNotice[] = [];
  let invitationsEnabled = true;

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
    try {
      invitationsEnabled = (await getAccountSettings(user.email))
        .invitation_notifications;
    } catch (error) {
      console.error(
        "[StockWise] Unable to load notification preferences:",
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
