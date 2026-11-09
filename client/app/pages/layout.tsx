import AppShell from "@/components/layout/chrome/AppShell";
import { requireSession } from "@/lib/auth/session";
import { getAccountSettings } from "@/lib/api/settings";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const settings = await getAccountSettings();
  return (
    <AppShell settings={settings} organizationId={session.organizationId}>
      {children}
    </AppShell>
  );
}
