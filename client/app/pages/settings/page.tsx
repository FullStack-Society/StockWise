import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import SettingsHeader from "@/components/features/settings/SettingsHeader";
import { getAccountSettings } from "@/lib/api/settings";
import { listOrganizations } from "@/lib/api/organizations";
import SettingsBrowser from "@/components/features/settings/SettingsBrowser";
import styles from "@/styles/settings/SettingsPage.module.css";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const [accountSettings, organizations] = await Promise.all([
    getAccountSettings(session.email),
    listOrganizations(session.email),
  ]);
  const activeOrganization =
    organizations.find(
      (organization) => organization.organization_id === session.organizationId,
    ) ?? organizations[0];
  const currentRole = activeOrganization?.role ?? "owner";
  const roleLabel = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
  const isOwner = currentRole === "owner";

  return (
    <div className={styles.page}>
      <SettingsHeader />
      <SettingsBrowser
        settings={accountSettings}
        isOwner={isOwner}
        roleLabel={roleLabel}
        organizationId={activeOrganization?.organization_id ?? null}
        organizationName={activeOrganization?.organization_name ?? null}
        canEditOrganization={isOwner}
      />
    </div>
  );
}
