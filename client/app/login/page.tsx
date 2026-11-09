import { redirect } from "next/navigation";
import AuthPage from "@/components/features/login/AuthPage";
import { getSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    loggedOut?: string;
    googleError?: string;
    accountExists?: string;
    twoFactor?: string;
  }>;
}) {
  const session = await getSession();
  if (session)
    redirect(session.organizationId ? ROUTES.dashboard : ROUTES.users);
  const params = await searchParams;

  return (
    <AuthPage
      key={`${params.loggedOut === "1" ? "after-logout" : "login-entry"}-${params.accountExists === "1" ? "account-exists" : ""}`}
      initialMode="login"
      googleError={params.googleError === "1"}
      accountExists={params.accountExists === "1"}
      twoFactorRequired={params.twoFactor === "1"}
    />
  );
}
