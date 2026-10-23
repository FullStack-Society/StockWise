// Roles and permissions. One source of truth for the whole app.
//
//  Owner : created the account. Full control, including billing and deleting the account.
//  Admin : configures the account and manages Staff, but cannot touch the Owner,
//          other Admins, billing, or account deletion.
//  Staff : manages stock only (inventory), nothing else.

export type Role = "Owner" | "Admin" | "Staff";

export const ROLES: Role[] = ["Owner", "Admin", "Staff"];

export const ROLE_INFO: Record<Role, { summary: string }> = {
  Owner: {
    summary:
      "Created the account. Full control, including billing and deleting the account.",
  },
  Admin: {
    summary:
      "Configures the account and manages Staff. Cannot change the Owner, other Admins or billing.",
  },
  Staff: {
    summary: "Manages stock only: view, add, edit and remove inventory items.",
  },
};

/** Turns whatever the session holds into a Role. Unknown values fall back to Staff (least access). */
export function normalizeRole(value: unknown): Role {
  const v = String(value ?? "").toLowerCase();
  if (v === "owner") return "Owner";
  if (v === "admin") return "Admin";
  return "Staff";
}

/** Which roles this person is allowed to give to someone else. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "Owner") return ["Admin", "Staff"];
  if (actor === "Admin") return ["Staff"];
  return [];
}

/** Can `actor` remove `target`, or change their role? Nobody can touch an Owner. */
export function canManageUser(actor: Role, target: Role): boolean {
  if (target === "Owner") return false;
  if (actor === "Owner") return true;
  if (actor === "Admin") return target === "Staff";
  return false;
}

/** Only Owners may change a role after the fact. Admins can add or remove Staff, nothing more. */
export function canChangeRole(actor: Role, target: Role): boolean {
  return actor === "Owner" && target !== "Owner";
}

/** Everyone can open the Users tab, but only Owners and Admins see the user list. Staff see roles only. */
export function canViewUserList(actor: Role): boolean {
  return actor === "Owner" || actor === "Admin";
}

export type Access = "full" | "limited" | "none";

export type PermissionRow = {
  id: string;
  label: string;
  Owner: Access;
  Admin: Access;
  Staff: Access;
  note?: string;
};

export const PERMISSIONS: PermissionRow[] = [
  {
    id: "dashboard",
    label: "View dashboard",
    Owner: "full",
    Admin: "full",
    Staff: "full",
  },
  {
    id: "inventory",
    label: "Manage stock and inventory",
    Owner: "full",
    Admin: "full",
    Staff: "full",
  },
  {
    id: "reports",
    label: "View reports and export data",
    Owner: "full",
    Admin: "full",
    Staff: "none",
  },
  {
    id: "settings",
    label: "Account settings and preferences",
    Owner: "full",
    Admin: "limited",
    Staff: "none",
    note: "Admins cannot touch billing or delete the account",
  },
  {
    id: "users",
    label: "Add and remove users",
    Owner: "full",
    Admin: "limited",
    Staff: "none",
    note: "Admins can only manage Staff",
  },
  {
    id: "roles",
    label: "Change user roles",
    Owner: "full",
    Admin: "none",
    Staff: "none",
  },
  {
    id: "billing",
    label: "Billing and deleting the account",
    Owner: "full",
    Admin: "none",
    Staff: "none",
  },
];
