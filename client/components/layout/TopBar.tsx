import { Search } from "lucide-react";
import {
  listOrganizations,
  listPendingInvitations,
  type InvitationNotice,
  type OrganizationSummary,
} from "@/lib/api/organizations";
import { getAccountSettings } from "@/lib/api/settings";
import { getSession } from "@/lib/auth/session";
import styles from "@/styles/layout/TopBar.module.css";
import TopBarControls from "./TopBarControls";

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
      <label className={styles.search}>
        <Search size={14} />
        <input
          type="search"
          placeholder="Search products, SKU..."
          className={styles.searchInput}
        />
      </label>

      <TopBarControls
        user={user}
        organizations={organizations}
        invitations={invitations}
        invitationsEnabled={invitationsEnabled}
      />
    </header>
  );
}
