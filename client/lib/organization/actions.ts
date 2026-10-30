"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  changeOrganizationMemberRole,
  createOrganization,
  inviteOrganizationMember,
  leaveOrganization,
  listOrganizations,
  removeOrganizationMember,
  renameOrganization,
  respondToInvitation,
} from "@/lib/api/organizations";
import { ROUTES } from "@/app/routes";
import {
  getSession,
  requireSession,
  updateOrganizationSession,
} from "@/lib/auth/session";

export type OrganizationActionResult =
  | { ok: true }
  | { ok: false; error: string };

function failure(error: unknown): OrganizationActionResult {
  if (error instanceof ApiError) return { ok: false, error: error.message };
  console.error("[StockWise] Organization action failed:", error);
  return {
    ok: false,
    error: "Unable to complete that request. Please try again.",
  };
}

function refreshOrganizationViews() {
  revalidatePath("/", "layout");
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.inventory);
  revalidatePath(ROUTES.users);
  revalidatePath(ROUTES.settings);
}

export async function renameOrganizationAction(
  organizationName: string,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  if (!session.organizationId) {
    return { ok: false, error: "Choose an organization first." };
  }
  const name = organizationName.trim();
  if (!name || name.length > 160) {
    return { ok: false, error: "Enter an organization name (up to 160 characters)." };
  }
  try {
    await renameOrganization(session.organizationId, session.email, name);
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function createOrganizationAction(
  organizationName: string,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  const name = organizationName.trim();
  if (!name || name.length > 160) {
    return {
      ok: false,
      error: "Enter an organization name (up to 160 characters).",
    };
  }
  try {
    const organization = await createOrganization(session.email, name);
    await updateOrganizationSession(
      organization.organization_id,
      organization.role,
    );
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function switchOrganizationAction(organizationId: number) {
  const session = await requireSession();
  try {
    const organizations = await listOrganizations(session.email);
    const selected = organizations.find(
      (organization) => organization.organization_id === organizationId,
    );
    if (!selected)
      return {
        ok: false as const,
        error: "You are not a member of that organization.",
      };
    await updateOrganizationSession(organizationId, selected.role);
    refreshOrganizationViews();
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function respondToInvitationAction(
  invitationId: number,
  accept: boolean,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  try {
    const response = await respondToInvitation(
      invitationId,
      session.email,
      accept,
    );
    if (accept && response.organization_id && response.role) {
      await updateOrganizationSession(response.organization_id, response.role);
    }
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function inviteOrganizationMemberAction(
  email: string,
  role: "manager" | "staff",
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  if (!session.organizationId)
    return { ok: false, error: "Choose an organization first." };
  try {
    await inviteOrganizationMember(session.organizationId, {
      actor_email: session.email,
      email: email.trim().toLowerCase(),
      role,
    });
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function removeOrganizationMemberAction(
  email: string,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  if (!session.organizationId)
    return { ok: false, error: "Choose an organization first." };
  try {
    await removeOrganizationMember(
      session.organizationId,
      email,
      session.email,
    );
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function changeOrganizationRoleAction(
  email: string,
  role: "manager" | "staff",
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  if (!session.organizationId)
    return { ok: false, error: "Choose an organization first." };
  try {
    await changeOrganizationMemberRole(
      session.organizationId,
      email,
      session.email,
      role,
    );
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function leaveOrganizationAction(): Promise<OrganizationActionResult> {
  const session = await requireSession();
  if (!session.organizationId)
    return { ok: false, error: "Choose an organization first." };
  try {
    await leaveOrganization(session.organizationId, session.email);
    const remaining = await listOrganizations(session.email);
    const next = remaining[0] ?? null;
    await updateOrganizationSession(
      next?.organization_id ?? null,
      next?.role ?? session.role,
    );
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function loadSessionOrganizationState() {
  const session = await getSession();
  if (!session) return null;
  try {
    const organizations = await listOrganizations(session.email);
    return {
      session,
      organizations,
      activeOrganizationId: session.organizationId,
    };
  } catch (error) {
    console.error("[StockWise] Unable to load organizations:", error);
    return { session, organizations: [], activeOrganizationId: null };
  }
}
