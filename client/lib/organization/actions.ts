"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  changeOrganizationMemberRole,
  deleteOrganizationLeaveNotification,
  heartbeatOrganizationPresence,
  listOrganizationLoginNotifications,
  markOrganizationLoginNotificationRead,
  createOrganization,
  deleteOrganization,
  inviteOrganizationMember,
  leaveOrganization,
  listOrganizations,
  markOrganizationLeaveNotificationRead,
  removeOrganizationMember,
  renameOrganization,
  respondToInvitation,
  transferOrganizationOwnership,
} from "@/lib/api/organizations";
import { ROUTES } from "@/lib/routes";
import {
  getSession,
  requireOrganizationSession,
  requireSession,
  updateOrganizationSession,
} from "@/lib/auth/session";

export type OrganizationActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function heartbeatOrganizationPresenceAction() {
  await requireOrganizationSession();
  await heartbeatOrganizationPresence();
}

export async function listOrganizationLoginNotificationsAction() {
  const session = await requireSession();
  if (!session.organizationId || !["owner", "manager"].includes(session.role)) {
    return [];
  }
  return listOrganizationLoginNotifications();
}

export async function markOrganizationLoginNotificationReadAction(
  notificationId: number,
): Promise<OrganizationActionResult> {
  const session = await requireOrganizationSession();
  if (!["owner", "manager"].includes(session.role)) {
    return { ok: false, error: "You cannot access this notification." };
  }
  try {
    await markOrganizationLoginNotificationRead(notificationId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

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

export async function transferOrganizationOwnershipAction(
  organizationId: number,
  targetEmail: string,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  if (session.organizationId !== organizationId) {
    return { ok: false, error: "Switch to the organization you want to transfer." };
  }
  const email = targetEmail.trim().toLowerCase();
  if (!email || email === session.email.toLowerCase()) {
    return { ok: false, error: "Enter another active member’s email address." };
  }
  try {
    await transferOrganizationOwnership(organizationId, session.email, email);
    const organizations = await listOrganizations(session.email);
    const selected = organizations.find(
      (organization) => organization.organization_id === organizationId,
    );
    await updateOrganizationSession(
      selected?.organization_id ?? null,
      selected?.role ?? "manager",
    );
    refreshOrganizationViews();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function deleteOrganizationAction(
  organizationId: number,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  if (session.organizationId !== organizationId) {
    return { ok: false, error: "Switch to the organization you want to delete." };
  }
  try {
    await deleteOrganization(organizationId, session.email);
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

export async function markOrganizationLeaveNotificationReadAction(
  notificationId: number,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  try {
    await markOrganizationLeaveNotificationRead(
      notificationId,
      session.email,
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function deleteOrganizationLeaveNotificationAction(
  notificationId: number,
): Promise<OrganizationActionResult> {
  const session = await requireSession();
  try {
    await deleteOrganizationLeaveNotification(notificationId, session.email);
    revalidatePath("/", "layout");
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
