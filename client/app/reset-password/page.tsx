import BrandPanel from "@/components/features/login/BrandPanel";
import ResetPasswordForm from "@/components/features/login/ResetPasswordForm";
import type { Metadata } from "next";
import pageStyles from "@/styles/login/LoginPage.module.css";

export const instant = false;
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className={pageStyles.page}>
      <BrandPanel variant="login" />
      <section className={pageStyles.formPanel}>
        <ResetPasswordForm token={token ?? ""} />
      </section>
    </main>
  );
}
