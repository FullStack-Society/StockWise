import { redirect } from "next/navigation";
import AuthPage from "@/components/features/login/AuthPage";
import { getSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export const instant = false;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ googleError?: string }>;
}) {
  const session = await getSession();
  if (session)
    redirect(session.organizationId ? ROUTES.dashboard : ROUTES.users);
  const params = await searchParams;

  return (
    <AuthPage
      initialMode="register"
      googleError={params.googleError === "1"}
    />
  );
}
