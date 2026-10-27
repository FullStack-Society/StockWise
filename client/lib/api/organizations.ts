import "server-only";

import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

export type OrganizationSummary = {
  organization_id: number;
  organization_name: string;
  role: "owner" | "admin" | "staff";
};

export type InvitationNotice = {
  invitation_id: number;
  organization_id: number;
  organization_name: string;
  role: "admin" | "staff";
  invited_by_email: string;
  created_at: string;
};

export type OrganizationMember = {
  email: string;
  full_name: string;
  role: "owner" | "admin" | "staff";
  status: "Active" | "Invited";
  joined_at: string | null;
};

export function listOrganizations(email: string) {
  return apiRequest<OrganizationSummary[]>(ENDPOINTS.organizations.mine, {
    query: { email },
  });
}

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

export function listPendingInvitations(email: string) {
  return apiRequest<InvitationNotice[]>(ENDPOINTS.organizations.invitations, {
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
  input: { actor_email: string; email: string; role: "admin" | "staff" },
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
    role: "owner" | "admin" | "staff" | null;
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
  role: "admin" | "staff",
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
