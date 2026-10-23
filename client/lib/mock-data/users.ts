import type { Role } from "@/lib/auth/roles";

export type UserStatus = "Active" | "Invited";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastActive: string;
};

// Sample data. Replace with API/database calls later.
export const initialUsers: TeamUser[] = [
  {
    id: "u1",
    name: "Admin User",
    email: "admin@stockwise.com",
    role: "Owner",
    status: "Active",
    lastActive: "Today, 09:41 AM",
  },
  {
    id: "u2",
    name: "Maria Santos",
    email: "maria.santos@stockwise.com",
    role: "Admin",
    status: "Active",
    lastActive: "Today, 08:15 AM",
  },
  {
    id: "u3",
    name: "Daniel Reyes",
    email: "daniel.reyes@stockwise.com",
    role: "Staff",
    status: "Active",
    lastActive: "Yesterday, 05:30 PM",
  },
  {
    id: "u4",
    name: "Kelly Tan",
    email: "kelly.tan@stockwise.com",
    role: "Staff",
    status: "Active",
    lastActive: "2 days ago",
  },
  {
    id: "u5",
    name: "Paolo Cruz",
    email: "paolo.cruz@stockwise.com",
    role: "Staff",
    status: "Invited",
    lastActive: "Never",
  },
  {
    id: "u6",
    name: "Ana Lim",
    email: "ana.lim@stockwise.com",
    role: "Admin",
    status: "Invited",
    lastActive: "Never",
  },
];
