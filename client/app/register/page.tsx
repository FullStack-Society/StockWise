import { redirect } from "next/navigation";
import BrandPanel from "@/components/features/login/BrandPanel";
import RegisterForm from "@/components/features/login/RegisterForm";
import styles from "@/styles/login/LoginPage.module.css";
import { getSession } from "@/lib/auth/session";
import { ROUTES } from "../routes";

export const instant = false;

export default async function RegisterPage() {
  const session = await getSession();
  if (session)
    redirect(session.organizationId ? ROUTES.dashboard : ROUTES.users);

  return (
    <main className={styles.page}>
      <BrandPanel variant="register" />
      <section className={styles.formPanel}>
        <RegisterForm />
      </section>
    </main>
  );
}
