import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Role } from "./roles";

// DEMO ONLY. Three test accounts, one per role, so you can try every permission level.

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordEnv: string;
};

export const DEMO_USERS: DemoUser[] = [
  {
    id: "u1",
    name: "Admin User",
    email: "admin@stockwise.com",
    role: "Owner",
    passwordEnv: "DEMO_PASSWORD",
  },
  {
    id: "u2",
    name: "Maria Santos",
    email: "maria.santos@stockwise.com",
    role: "Admin",
    passwordEnv: "DEMO_ADMIN_PASSWORD",
  },
  {
    id: "u3",
    name: "Daniel Reyes",
    email: "daniel.reyes@stockwise.com",
    role: "Staff",
    passwordEnv: "DEMO_STAFF_PASSWORD",
  },
];

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function findDemoUserById(id: unknown): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === String(id));
}

export async function verifyCredentials(email: string, password: string) {
  const user = DEMO_USERS.find((u) => u.email === email.trim().toLowerCase());
  const expected = user ? process.env[user.passwordEnv] : undefined;

  const ok = safeEqual(password, expected ?? "\u0000no-such-password");
  if (!user || !expected || !ok) return null;

  return { id: user.id, name: user.name, role: user.role };
}
