// Roles and permissions. One source of truth for the whole app.
//
//  Owner : created the account. Full control, including billing and deleting the account.
//  Manager : configures the account and manages Staff, but cannot touch the Owner,
//            other Managers, billing, or account deletion.
//  Staff : manages stock only (inventory), nothing else.

export type Role = "owner" | "manager" | "staff";

export const ROLES: Role[] = ["owner", "manager", "staff"];

export const ROLE_INFO: Record<Role, { summary: string }> = {
  owner: {
    summary:
      "Owns this organization, manages every role, and must transfer ownership before leaving.",
  },
  manager: {
    summary:
      "Manages organization settings and Staff. Cannot manage the Owner or other Managers, and may leave the organization.",
  },
  staff: {
    summary: "Manages stock and may leave the organization, but cannot manage users.",
  },
};

/** Turns whatever the session holds into a Role. Unknown values fall back to Staff (least access). */
export function normalizeRole(value: unknown): Role {
  const v = String(value ?? "").toLowerCase();
  if (v === "owner") return "owner";
  if (v === "manager" || v === "admin") return "manager";
  return "staff";
}

/** Which roles this person is allowed to give to someone else. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "owner") return ["manager", "staff"];
  if (actor === "manager") return ["staff"];
  return [];
}

/** Can `actor` remove `target`, or change their role? Nobody can touch an Owner. */
export function canManageUser(actor: Role, target: Role): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "manager") return target === "staff";
  return false;
}

/** Only Owners may change a role after the fact. Managers can add or remove Staff, nothing more. */
export function canChangeRole(actor: Role, target: Role): boolean {
  return actor === "owner" && target !== "owner";
}

/** Everyone can open the Users tab, but only Owners and Managers see the user list. Staff see roles only. */
export function canViewUserList(actor: Role): boolean {
  return actor === "owner" || actor === "manager";
}

export type Access = "full" | "limited" | "none";

export type PermissionRow = {
  id: string;
  label: string;
  owner: Access;
  manager: Access;
  staff: Access;
  note?: string;
};

export const PERMISSIONS: PermissionRow[] = [
  {
    id: "dashboard",
    label: "View dashboard",
    owner: "full",
    manager: "full",
    staff: "full",
  },
  {
    id: "inventory",
    label: "Manage stock and inventory",
    owner: "full",
    manager: "full",
    staff: "full",
  },
  {
    id: "reports",
    label: "View reports and export data",
    owner: "full",
    manager: "full",
    staff: "none",
  },
  {
    id: "settings",
    label: "Account settings and preferences",
    owner: "full",
    manager: "limited",
    staff: "none",
    note: "Managers cannot touch billing or delete the account",
  },
  {
    id: "users",
    label: "Invite and remove members",
    owner: "full",
    manager: "limited",
    staff: "none",
    note: "Managers can only manage Staff",
  },
  {
    id: "leave",
    label: "Leave the organization",
    owner: "none",
    manager: "full",
    staff: "full",
    note: "Owners must transfer ownership before leaving",
  },
  {
    id: "roles",
    label: "Change user roles",
    owner: "full",
    manager: "none",
    staff: "none",
  },
  {
    id: "billing",
    label: "Billing and deleting the account",
    owner: "full",
    manager: "none",
    staff: "none",
  },
];
