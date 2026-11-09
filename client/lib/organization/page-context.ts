import "server-only";

import { requireSession } from "@/lib/auth/session";
import { listOrganizations } from "@/lib/api/organizations";

export async function getOrganizationPageContext() {
  const session = await requireSession();
  const organizations = await listOrganizations(session.email);
  const organization =
    organizations.find(
      (item) => item.organization_id === session.organizationId,
    ) ?? null;

  return {
    session: organization ? { ...session, role: organization.role } : session,
    organization,
  };
}
