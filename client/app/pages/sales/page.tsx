import type { Metadata } from "next";
import OrganizationSetup from "@/components/features/users/organizations/OrganizationSetup";
import SalesBrowser from "@/components/features/sales/SalesBrowser";
import { listInventoryMovements, listProducts } from "@/lib/api/inventory";
import { getOrganizationPageContext } from "@/lib/organization/page-context";
import styles from "@/styles/sales/SalesPage.module.css";

export const instant = false;
export const metadata: Metadata = { title: "StockWise | Sales" };

export default async function SalesPage() {
  const { organization } = await getOrganizationPageContext();
  if (!organization) return <OrganizationSetup />;
  const [products, movements] = await Promise.all([
    listProducts(),
    listInventoryMovements(),
  ]);
  return (
    <main className={`${styles.page} pageEnterSales`}>
      <SalesBrowser
        organizationId={organization.organization_id}
        canManageMerchantQr={
          organization.role === "owner" || organization.role === "manager"
        }
        products={products}
        recentSales={movements.filter(
          (movement) =>
            movement.type === "OUT" &&
            movement.remarks?.startsWith("Sale "),
        ).slice(0, 10)}
      />
    </main>
  );
}
