import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import SettingsHeader from "@/components/features/settings/SettingsHeader";
import { getAccountSettings, getInventoryDefaults } from "@/lib/api/settings";
import { listOrganizations } from "@/lib/api/organizations";
import SettingsPageContent from "@/components/features/settings/SettingsBrowser";
import styles from "@/styles/settings/SettingsBrowser.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const [accountSettings, inventoryDefaults, organizations] = await Promise.all([
    getAccountSettings(),
    getInventoryDefaults(),
    listOrganizations(session.email),
  ]);
  const activeOrganization =
    organizations.find(
      (organization) => organization.organization_id === session.organizationId,
    ) ?? organizations[0];
  const ownedOrganizations = organizations.filter(
    (organization) => organization.role === "owner",
  );
  const currentRole = activeOrganization?.role;
  const roleLabel = activeOrganization && currentRole
    ? `${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} · ${activeOrganization.organization_name}`
    : "No organization";
  const isOwner = currentRole === "owner";

  return (
    <div className={`${styles.page} pageEnterSettings`}>
      <div className="pageEnterBlock"><SettingsHeader /></div>
      <div className="pageEnterBlock pageEnterDelay1"><SettingsPageContent
        settings={accountSettings}
        defaultReorderPoint={inventoryDefaults.default_reorder_point}
        isOwner={isOwner}
        roleLabel={roleLabel}
        ownedOrganizationCount={ownedOrganizations.length}
        organizationId={activeOrganization?.organization_id ?? null}
        organizationName={activeOrganization?.organization_name ?? null}
        ownedOrganizationNames={ownedOrganizations.map(
          (organization) => organization.organization_name,
        )}
      /></div>
    </div>
  );
}
