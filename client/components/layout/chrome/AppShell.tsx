import SideBar from "./SideBar";
import TopBar from "./TopBar";
import ContentScroller from "./ContentScroller";
import UserPreferencesProvider from "@/components/providers/UserPreferencesProvider";
import StockAlertMonitor from "@/components/layout/runtime/StockAlertMonitor";
import UsageAnalyticsTracker from "@/components/layout/runtime/UsageAnalyticsTracker";
import PresenceHeartbeat from "@/components/layout/runtime/PresenceHeartbeat";
import IdleSessionGuard from "@/components/layout/runtime/IdleSessionGuard";
import type { AccountSettings } from "@/lib/api/settings";
import styles from "@/styles/layout/AppShell.module.css";

export default function AppShell({
  children,
  settings,
  organizationId,
}: {
  children: React.ReactNode;
  settings: AccountSettings;
  organizationId: number | null;
}) {
  return (
    <UserPreferencesProvider
      preferences={settings}
      initialAvatarData={settings.avatar_data}
    >
      <StockAlertMonitor organizationId={organizationId} />
      <UsageAnalyticsTracker organizationId={organizationId} />
      <PresenceHeartbeat organizationId={organizationId} />
      <IdleSessionGuard />
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
