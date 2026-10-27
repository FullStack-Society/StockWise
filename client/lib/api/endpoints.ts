// Keep backend URLs here so API route changes have a single source of truth.
export const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
  },
  inventory: {
    root: "/api/inventory/",
    item: (id: number) => `/api/inventory/${id}`,
    categories: ["/api/inventory/categories/", "/api/categories/"],
  },
  organizations: {
    create: "/api/organizations/",
    mine: "/api/organizations/mine",
    item: (organizationId: number) => `/api/organizations/${organizationId}`,
    invitations: "/api/organizations/invitations",
    organizationInvitations: (organizationId: number) =>
      `/api/organizations/${organizationId}/invitations`,
    invitationResponse: (invitationId: number) =>
      `/api/organizations/invitations/${invitationId}/respond`,
    members: (organizationId: number) =>
      `/api/organizations/${organizationId}/members`,
    member: (organizationId: number, email: string) =>
      `/api/organizations/${organizationId}/members/${encodeURIComponent(email)}`,
    memberRole: (organizationId: number, email: string) =>
      `/api/organizations/${organizationId}/members/${encodeURIComponent(email)}/role`,
    leave: (organizationId: number) =>
      `/api/organizations/${organizationId}/leave`,
  },
  reports: {
    inventory: "/api/reports/inventory",
  },
  settings: {
    root: "/api/settings",
    profile: "/api/settings/profile",
    preferences: "/api/settings/preferences",
    account: "/api/settings/account",
  },
};
