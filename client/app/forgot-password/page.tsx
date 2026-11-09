import ForgotPasswordForm from "@/components/features/login/ForgotPasswordForm";
import BrandPanel from "@/components/features/login/BrandPanel";
import pageStyles from "@/styles/login/LoginPage.module.css";

export default function ForgotPasswordPage() {
  return (
    <main className={pageStyles.page}>
      <BrandPanel variant="login" />
      <section className={pageStyles.formPanel}>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
