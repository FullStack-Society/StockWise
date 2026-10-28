"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AccountSettings } from "@/lib/api/settings";
import ProfileCard from "./ProfileCard";
import type { SettingsSection } from "@/lib/settings/types";
import ProfileForm from "./ProfileForm";
import PreferencesPanel from "./PreferencesPanel";
import SecurityPanel from "./SecurityPanel";
import BillingPanel from "./BillingPanel";
import DangerZone from "./DangerZone";
import OrganizationPanel from "./OrganizationPanel";
import styles from "@/styles/settings/SettingsPage.module.css";

export default function SettingsBrowser({
  settings,
  isOwner,
  roleLabel,
  organizationId,
  organizationName,
  canEditOrganization,
}: {
  settings: AccountSettings;
  isOwner: boolean;
  roleLabel: string;
  organizationId: number | null;
  organizationName: string | null;
  canEditOrganization: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<SettingsSection>("profile");

  useEffect(() => {
    const section = searchParams.get("section");
    if (
      section === "profile" ||
      section === "organization" ||
      section === "security" ||
      section === "preferences" ||
      section === "billing"
    ) {
      if (section === "organization" && !canEditOrganization) return;
      if (section === "billing" && !isOwner) return;
      setActive(section);
    }
  }, [searchParams, canEditOrganization, isOwner]);

  function selectSection(section: SettingsSection) {
    setActive(section);
    router.replace(`/pages/settings?section=${section}`, { scroll: false });
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebarCol}>
        <ProfileCard
          name={settings.name}
          email={settings.email}
          active={active}
          isOwner={isOwner}
          canEditOrganization={canEditOrganization}
          onSelect={selectSection}
        />
      </aside>
      <main className={styles.mainCol}>
        {active === "profile" && (
          <ProfileForm settings={settings} roleLabel={roleLabel} />
        )}
        {active === "organization" &&
          canEditOrganization &&
          organizationId !== null &&
          organizationName && (
            <OrganizationPanel
              organizationId={organizationId}
              organizationName={organizationName}
            />
          )}
        {active === "security" && (
          <>
            <SecurityPanel />
            <DangerZone isOwner={isOwner} />
          </>
        )}
        {active === "preferences" && <PreferencesPanel settings={settings} />}
        {active === "billing" && isOwner && <BillingPanel />}
      </main>
    </div>
  );
}
