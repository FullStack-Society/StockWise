import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth/session";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <AppShell>{children}</AppShell>;
}
