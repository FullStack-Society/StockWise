import SideBar from "./SideBar";
import TopBar from "./TopBar";
import ContentScroller from "./ContentScroller";
import UserPreferencesProvider from "./UserPreferencesProvider";
import type { AccountSettings } from "@/lib/api/settings";
import styles from "@/styles/layout/AppShell.module.css";

export default function AppShell({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: AccountSettings;
}) {
  return (
    <UserPreferencesProvider preferences={settings}>
      <div className={styles.shell}>
        <SideBar />
        <div className={styles.main}>
          <TopBar invitationsEnabled={settings.invitation_notifications} />
          <ContentScroller>{children}</ContentScroller>
        </div>
      </div>
    </UserPreferencesProvider>
  );
}
