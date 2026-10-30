"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Clock3, HardDrive } from "lucide-react";
import type { AccountSettings } from "@/lib/api/settings";
import ProfileCard from "./profile/ProfileCard";
import type { SettingsSection } from "@/lib/settings/types";
import ProfileForm from "./profile/ProfileForm";
import PreferencesPanel from "./preference/PreferencesPanel";
import SecurityPanel from "./security/SecurityPanel";
import BillingPanel from "./billing/BillingPanel";
import DangerZone from "./profile/DangerZone";
import OrganizationPanel from "./security/OrganizationPanel";
import ProfileOverviewPanel from "./profile/ProfileOverviewPanel";
import styles from "@/styles/settings/SettingsPage.module.css";

export default function SettingsBrowser({
  settings,
  isOwner,
  roleLabel,
  organizationId,
  organizationName,
}: {
  settings: AccountSettings;
  isOwner: boolean;
  roleLabel: string;
  organizationId: number | null;
  organizationName: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<SettingsSection>("profile");

  useEffect(() => {
    const section = searchParams.get("section");
    if (
      section === "profile" ||
      section === "security" ||
      section === "preferences" ||
      section === "billing"
    ) {
      if (section === "billing" && !isOwner) return;
      setActive(section);
    }
  }, [searchParams, isOwner]);

  function selectSection(section: SettingsSection) {
    setActive(section);
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
          onSelect={selectSection}
        />
      </aside>
      <main className={styles.mainCol}>
        {active === "profile" && (
          <>
            <ProfileForm settings={settings} roleLabel={roleLabel} />
            <ProfileOverviewPanel />
            <DangerZone isOwner={isOwner} />
          </>
        )}
        {active === "security" && (
          <>
            <SecurityPanel />
            {isOwner &&
              organizationId !== null &&
              organizationName !== null && (
                <OrganizationPanel
                  organizationId={organizationId}
                  organizationName={organizationName}
                />
              )}
            <DangerZone isOwner={isOwner} />
          </>
        )}
        {active === "preferences" && <PreferencesPanel settings={settings} />}
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
