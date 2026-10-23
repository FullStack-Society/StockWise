import type { Metadata } from "next";
import { requireSession, getSession } from "@/lib/auth/session";
import SettingsHeader from "@/components/features/settings/SettingsHeader";
import ProfileCard from "@/components/features/settings/ProfileCard";
import AccountHealth from "@/components/features/settings/AccountHealth";
import ProfileForm from "@/components/features/settings/ProfileForm";
import PreferencesPanel from "@/components/features/settings/PreferencesPanel";
import DangerZone from "@/components/features/settings/DangerZone";
import SettingsFooterStats from "@/components/features/settings/SettingsFooterStats";
import styles from "@/styles/settings/SettingsPage.module.css";
import { findDemoUserById } from "@/lib/auth/users";

export const instant = false;

export const metadata: Metadata = { title: "StockWise | Settings" };

export default async function SettingsPage() {
  await requireSession();
  const session = await getSession();

  const fullName = session?.name ?? "Admin User";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");
  // Demo only: the session has no email yet. Replace with a database lookup.
  const email = findDemoUserById(session?.id)?.email ?? "";

  return (
    <div className={styles.page}>
      <SettingsHeader />
      <div className={styles.layout}>
        <aside className={styles.sidebarCol}>
          <ProfileCard name={fullName} />
          <AccountHealth />
        </aside>
        <div className={styles.mainCol}>
          <ProfileForm
            firstName={firstName}
            lastName={lastName}
            email={email}
          />
          <PreferencesPanel />
          <DangerZone />
        </div>
      </div>
      <SettingsFooterStats />
    </div>
  );
}
