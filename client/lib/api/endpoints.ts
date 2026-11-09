// Keep backend URLs here so API route changes have a single source of truth.
export const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    verifyRegistration: "/api/auth/register/verify",
    resendRegistrationCode: "/api/auth/register/resend",
    google: "/api/auth/google",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
    verifyTwoFactor: "/api/auth/verify-2fa",
  },
  inventory: {
    root: "/api/inventory/",
    alerts: "/api/inventory/alerts",
    item: (id: number) => `/api/inventory/${id}`,
    movements: "/api/inventory/movements",
    productMovements: (id: number) => `/api/inventory/${id}/movements`,
    stocktake: (id: number) => `/api/inventory/${id}/stocktake`,
    categories: ["/api/inventory/categories/", "/api/categories/"],
    category: (id: number) => `/api/inventory/categories/${id}`,
  },
  orders: {
    root: "/api/orders/",
    history: "/api/orders/history",
    item: (orderId: number) => `/api/orders/${orderId}`,
    delete: (orderId: number) => `/api/orders/${orderId}`,
    receive: (orderId: number, itemId: number) =>
      `/api/orders/${orderId}/items/${itemId}/receive`,
  },
  sales: { checkout: "/api/sales/" },
  organizations: {
    create: "/api/organizations/",
    mine: "/api/organizations/mine",
    notifications: "/api/organizations/notifications",
    loginNotifications: "/api/organizations/login-notifications",
    publishMemberLogin: "/api/organizations/member-login",
    presenceHeartbeat: "/api/organizations/presence/heartbeat",
    notificationRead: (notificationId: number) =>
      `/api/organizations/notifications/${notificationId}/read`,
    notification: (notificationId: number) =>
      `/api/organizations/notifications/${notificationId}`,
    loginNotificationRead: (notificationId: number) =>
      `/api/organizations/login-notifications/${notificationId}/read`,
    item: (organizationId: number) => `/api/organizations/${organizationId}`,
    transferOwnership: (organizationId: number) =>
      `/api/organizations/${organizationId}/transfer-ownership`,
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
    dashboardStockFlow: "/api/reports/dashboard-stock-flow",
    usageAnalytics: "/api/reports/usage-analytics",
    usagePageView: "/api/reports/usage-analytics/page-view",
  },
  settings: {
    root: "/api/settings/",
    profile: "/api/settings/profile",
    avatar: "/api/settings/avatar",
    preferences: "/api/settings/preferences",
    inventoryDefaults: "/api/settings/inventory-defaults",
    securityPrivacyPreferences: "/api/settings/security-privacy-preferences",
    usageAnalyticsConsent: "/api/settings/usage-analytics-consent",
    password: "/api/settings/password",
    mfa: "/api/settings/mfa",
    securityStatus: "/api/settings/security-status",
    mfaEnroll: "/api/settings/mfa/enroll",
    mfaConfirm: "/api/settings/mfa/confirm",
    mfaDisable: "/api/settings/mfa/disable",
    account: "/api/settings/account",
  },
};
