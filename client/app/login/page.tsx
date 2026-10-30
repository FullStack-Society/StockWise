import { redirect } from "next/navigation";
import BrandPanel from "@/components/features/login/BrandPanel";
import LoginForm from "@/components/features/login/LoginForm";
import styles from "@/styles/login/LoginPage.module.css";
import { getSession } from "@/lib/auth/session";
import { ROUTES } from "../routes";

export const instant = false;

export default async function LoginPage() {
  const session = await getSession();
  if (session)
    redirect(session.organizationId ? ROUTES.dashboard : ROUTES.users);

  return (
    <main className={styles.page}>
      <BrandPanel variant="login" />
      <section className={styles.formPanel}>
        <LoginForm />
      </section>
    </main>
  );
}
