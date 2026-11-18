import CreateOrganizationPanel from "@/components/features/users/organizations/CreateOrganizationPanel";
import styles from "@/styles/users/UsersPage.module.css";

export default function OrganizationSetup() {
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>No organization selected</h1>
        <p className={styles.subtitle}>
          Select an organization or create one to continue.
        </p>
      </header>
      <CreateOrganizationPanel />
    </div>
  );
}
