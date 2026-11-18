import {
  listOrganizations,
  listOrganizationLeaveNotifications,
  listOrganizationLoginNotifications,
  listPendingInvitations,
  type InvitationNotice,
  type OrganizationLeaveNotification,
  type OrganizationLoginNotification,
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
  let leaveNotifications: OrganizationLeaveNotification[] = [];
  let loginNotifications: OrganizationLoginNotification[] = [];

  if (user?.email) {
    const results = await Promise.allSettled([
      listOrganizations(user.email),
      listPendingInvitations(user.email),
      listOrganizationLeaveNotifications(user.email),
      user.organizationId
        ? listOrganizationLoginNotifications()
        : Promise.resolve([] as OrganizationLoginNotification[]),
    ]);
    if (results[0].status === "fulfilled") {
      organizations = results[0].value;
    } else {
      console.error(
        "[StockWise] Unable to load organizations:",
        results[0].reason,
      );
    }
    if (results[1].status === "fulfilled") {
      invitations = results[1].value;
    } else {
      console.error(
        "[StockWise] Unable to load invitations:",
        results[1].reason,
      );
    }
    if (results[2].status === "fulfilled") {
      leaveNotifications = results[2].value;
    } else {
      console.error(
        "[StockWise] Unable to load organization leave notifications:",
        results[2].reason,
      );
    }
    if (user.organizationId && results[3].status === "fulfilled") {
      loginNotifications = results[3].value;
    } else if (user.organizationId && results[3].status === "rejected") {
      console.error(
        "[StockWise] Unable to load member login notifications:",
        results[3].reason,
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
        leaveNotifications={leaveNotifications}
        loginNotifications={loginNotifications}
        invitationsEnabled={invitationsEnabled}
      />
    </header>
  );
}
