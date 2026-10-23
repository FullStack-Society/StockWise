const BASE = "/pages";

export const ROUTES = {
  login: "/login",
  dashboard: `${BASE}/dashboard`,
  inventory: `${BASE}/inventory`,
  users: `${BASE}/users`,
  reports: `${BASE}/reports`,
  settings: `${BASE}/settings`,
} as const;

export const PROTECTED_ROUTES = [
  ROUTES.dashboard,
  ROUTES.inventory,
  ROUTES.users,
  ROUTES.reports,
  ROUTES.settings,
];
