import "server-only";

import { cache } from "react";
import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

export type OrganizationSummary = {
  organization_id: number;
  organization_name: string;
  role: "owner" | "manager" | "staff";
};

export type InvitationNotice = {
  invitation_id: number;
  organization_id: number;
  organization_name: string;
  role: "manager" | "staff";
  invited_by_email: string;
  created_at: string;
};

export type OrganizationLeaveNotification = {
  notification_id: number;
  organization_id: number;
  organization_name: string;
  actor_email: string;
  actor_name: string;
  created_at: string;
  read_at: string | null;
};

export type OrganizationLoginNotification = {
  notification_id: number;
  organization_id: number;
  actor_name: string;
  actor_role: "manager" | "staff";
  created_at: string;
  read_at: string | null;
};

export type OrganizationMember = {
  email: string;
  full_name: string;
  role: "owner" | "manager" | "staff";
  status: "Active" | "Invited";
  online_status: "Active" | "Offline" | null;
  joined_at: string | null;
};

export function heartbeatOrganizationPresence() {
  return apiRequest<void>(ENDPOINTS.organizations.presenceHeartbeat, {
    method: "POST",
  });
}

export function publishMemberLogin() {
  return apiRequest<void>(ENDPOINTS.organizations.publishMemberLogin, {
    method: "POST",
  });
}

export function listOrganizationLoginNotifications() {
  return apiRequest<OrganizationLoginNotification[]>(
    ENDPOINTS.organizations.loginNotifications,
  );
}

export function markOrganizationLoginNotificationRead(notificationId: number) {
  return apiRequest<void>(
    ENDPOINTS.organizations.loginNotificationRead(notificationId),
    { method: "PUT" },
  );
}

export const listOrganizations = cache((email: string) =>
  apiRequest<OrganizationSummary[]>(ENDPOINTS.organizations.mine, {
    query: { email },
  }),
);

export function createOrganization(email: string, organizationName: string) {
  return apiRequest<OrganizationSummary>(ENDPOINTS.organizations.create, {
    method: "POST",
    body: { email, organization_name: organizationName },
  });
}

export function renameOrganization(
  organizationId: number,
  actorEmail: string,
  organizationName: string,
) {
  return apiRequest<OrganizationSummary>(
    ENDPOINTS.organizations.item(organizationId),
    {
      method: "PUT",
      body: { actor_email: actorEmail, organization_name: organizationName },
    },
  );
}

export function transferOrganizationOwnership(
  organizationId: number,
  actorEmail: string,
  targetEmail: string,
) {
  return apiRequest<void>(ENDPOINTS.organizations.transferOwnership(organizationId), {
    method: "POST",
    body: { actor_email: actorEmail, target_email: targetEmail },
  });
}

export function deleteOrganization(organizationId: number, actorEmail: string) {
  return apiRequest<void>(ENDPOINTS.organizations.item(organizationId), {
    method: "DELETE",
    query: { actor_email: actorEmail },
  });
}

export function listPendingInvitations(email: string) {
  return apiRequest<InvitationNotice[]>(ENDPOINTS.organizations.invitations, {
    query: { email },
  });
}

export function listOrganizationLeaveNotifications(email: string) {
  return apiRequest<OrganizationLeaveNotification[]>(
    ENDPOINTS.organizations.notifications,
    { query: { email } },
  );
}

export function markOrganizationLeaveNotificationRead(
  notificationId: number,
  email: string,
) {
  return apiRequest<void>(
    ENDPOINTS.organizations.notificationRead(notificationId),
    { method: "PUT", query: { email } },
  );
}

export function deleteOrganizationLeaveNotification(
  notificationId: number,
  email: string,
) {
  return apiRequest<void>(ENDPOINTS.organizations.notification(notificationId), {
    method: "DELETE",
    query: { email },
  });
}

export function listOrganizationMembers(
  organizationId: number,
  actorEmail: string,
) {
  return apiRequest<OrganizationMember[]>(
    ENDPOINTS.organizations.members(organizationId),
    { query: { actor_email: actorEmail } },
  );
}

export function inviteOrganizationMember(
  organizationId: number,
  input: { actor_email: string; email: string; role: "manager" | "staff" },
) {
  return apiRequest<{ invitation_id: number }>(
    ENDPOINTS.organizations.organizationInvitations(organizationId),
    { method: "POST", body: input },
  );
}

export function respondToInvitation(
  invitationId: number,
  email: string,
  accept: boolean,
) {
  return apiRequest<{
    organization_id: number | null;
    organization_name: string | null;
    role: "owner" | "manager" | "staff" | null;
  }>(ENDPOINTS.organizations.invitationResponse(invitationId), {
    method: "POST",
    body: { email, accept },
  });
}

export function removeOrganizationMember(
  organizationId: number,
  email: string,
  actorEmail: string,
) {
  return apiRequest<void>(
    ENDPOINTS.organizations.member(organizationId, email),
    { method: "DELETE", query: { actor_email: actorEmail } },
  );
}

export function changeOrganizationMemberRole(
  organizationId: number,
  email: string,
  actorEmail: string,
  role: "manager" | "staff",
) {
  return apiRequest<void>(
    ENDPOINTS.organizations.memberRole(organizationId, email),
    { method: "PUT", body: { actor_email: actorEmail, role } },
  );
}

export function leaveOrganization(organizationId: number, email: string) {
  return apiRequest<void>(ENDPOINTS.organizations.leave(organizationId), {
    method: "POST",
    query: { email },
  });
}
