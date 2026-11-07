"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Clock3, HardDrive } from "lucide-react";
import type { AccountSecurityStatus, AccountSettings } from "@/lib/api/settings";
import { getAccountSecurityStatus } from "@/lib/settings/actions";
import ProfileCard from "./profile/ProfileCard";
import type { SettingsSection } from "@/lib/settings/types";
import ProfileForm from "./profile/ProfileForm";
import PreferencesPanel from "./preference/PreferencesPanel";
import SecurityPanel from "./security/SecurityPanel";
import BillingPanel from "./billing/BillingPanel";
import DangerZone from "./profile/DangerZone";
import OrganizationPanel from "./security/OrganizationPanel";
import ProfileOverviewPanel from "./profile/ProfileOverviewPanel";
import styles from "@/styles/settings/SettingsBrowser.module.css";

export default function SettingsPage({
  settings,
  defaultReorderPoint,
  isOwner,
  roleLabel,
  ownedOrganizationCount,
  organizationId,
  organizationName,
  ownedOrganizationNames,
}: {
  settings: AccountSettings;
  defaultReorderPoint: number;
  isOwner: boolean;
  roleLabel: string;
  ownedOrganizationCount: number;
  organizationId: number | null;
  organizationName: string | null;
  ownedOrganizationNames: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const active: SettingsSection =
    section === "profile" ||
    section === "security" ||
    section === "preferences" ||
    (section === "billing" && isOwner)
      ? section
      : "profile";
  const [securityStatus, setSecurityStatus] =
    useState<AccountSecurityStatus | null>(null);

  useEffect(() => {
    let activeRequest = true;
    getAccountSecurityStatus()
      .then((status) => {
        if (activeRequest) setSecurityStatus(status);
      })
      .catch(() => {
        if (activeRequest) setSecurityStatus(null);
      });
    return () => {
      activeRequest = false;
    };
  }, [active]);

  function selectSection(section: SettingsSection) {
    router.replace(`/pages/settings?section=${section}`, { scroll: false });
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebarCol}>
        <ProfileCard
          settings={settings}
          roleLabel={roleLabel}
          active={active}
          isOwner={isOwner}
          securityStatus={securityStatus}
          onSelect={selectSection}
        />
      </aside>
      <main className={styles.mainCol}>
        {active === "profile" && (
          <>
            <ProfileForm
              settings={settings}
              roleLabel={roleLabel}
              ownedOrganizationCount={ownedOrganizationCount}
            />
            <ProfileOverviewPanel />
            <DangerZone ownedOrganizationNames={ownedOrganizationNames} />
          </>
        )}
        {active === "security" && (
          <>
            <SecurityPanel securityStatus={securityStatus} />
            {isOwner &&
              organizationId !== null &&
              organizationName !== null && (
                <OrganizationPanel
                  organizationId={organizationId}
                  organizationName={organizationName}
                />
              )}
            <DangerZone ownedOrganizationNames={ownedOrganizationNames} />
          </>
        )}
        {active === "preferences" && (
          <PreferencesPanel
            settings={settings}
            defaultReorderPoint={defaultReorderPoint}
          />
        )}
        {active === "billing" && isOwner && <BillingPanel />}
      </main>
      <section className={styles.statusBar} aria-label="Account overview">
        <div className={styles.statusItem}>
          <Activity size={14} aria-hidden />
          <div>
            <span className={styles.statusLabel}>System status</span>
            <strong>Status not reported</strong>
          </div>
        </div>
        <div className={styles.statusItem}>
          <Clock3 size={14} aria-hidden />
          <div>
            <span className={styles.statusLabel}>Last login</span>
            <strong>Timestamp unavailable</strong>
          </div>
        </div>
        <div className={styles.statusItem}>
          <HardDrive size={14} aria-hidden />
          <div>
            <span className={styles.statusLabel}>Storage usage</span>
            <strong>Not reported</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
