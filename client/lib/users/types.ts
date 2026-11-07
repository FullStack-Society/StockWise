import type { Role } from "@/lib/auth/roles";

export type UserStatus = "Active" | "Invited";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  presenceStatus: "Active" | "Offline" | null;
  joinedAt: string;
};
