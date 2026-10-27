"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/auth/roles";
import { canManageUser } from "@/lib/auth/roles";
import type { TeamUser } from "@/lib/types/users";
import type { OrganizationMember } from "@/lib/api/organizations";
import {
  changeOrganizationRoleAction,
  inviteOrganizationMemberAction,
  leaveOrganizationAction,
  removeOrganizationMemberAction,
} from "@/lib/organization/actions";
import UsersHeader from "./UsersHeader";
import UsersStats from "./UsersStats";
import UsersFilterBar from "./UsersFilterBar";
import UsersTable from "./UsersTable";
import AddUserModal from "@/components/modals/users/AddUserModal";
import styles from "@/styles/users/UsersBrowser.module.css";

type Props = {
  currentRole: Role;
  currentUserId: string;
  organizationName: string;
  initialMembers: OrganizationMember[];
};

function toTeamUser(member: OrganizationMember): TeamUser {
  return {
    id: member.email.toLowerCase(),
    name: member.full_name,
    email: member.email,
    role: member.role,
    status: member.status,
    joinedAt: member.joined_at
      ? new Date(member.joined_at).toLocaleDateString()
      : member.status === "Invited"
        ? "Never"
        : "—",
  };
}

export default function UsersBrowser({
  currentRole,
  currentUserId,
  organizationName,
  initialMembers,
}: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<TeamUser[]>(initialMembers.map(toTeamUser));
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)) &&
        (!roleFilter || u.role === roleFilter),
    );
  }, [users, search, roleFilter]);

  async function inviteUser(email: string, role: Exclude<Role, "owner">) {
    const result = await inviteOrganizationMemberAction(email, role);
    if (!result.ok) throw new Error(result.error);
    setShowAdd(false);
    setError("");
    router.refresh();
  }

  function removeUser(id: string) {
    const target = users.find((u) => u.id === id);
    if (!target || !canManageUser(currentRole, target.role)) return;
    if (
      !window.confirm(
        target.status === "Invited"
          ? `Revoke the invitation for ${target.email}?`
          : `Remove ${target.name} from ${organizationName}?`,
      )
    )
      return;
    setError("");
    startTransition(async () => {
      const result = await removeOrganizationMemberAction(target.email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUsers((list) => list.filter((u) => u.id !== id));
      router.refresh();
    });
  }

  function changeRole(id: string, role: Role) {
    const target = users.find((u) => u.id === id);
    if (!target || (role !== "admin" && role !== "staff")) return;
    startTransition(async () => {
      const result = await changeOrganizationRoleAction(target.email, role);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUsers((list) =>
        list.map((user) => (user.id === id ? { ...user, role } : user)),
      );
      router.refresh();
    });
  }

  function leaveOrganization() {
    if (!window.confirm(`Leave ${organizationName}? You will lose access to its inventory.`)) return;
    startTransition(async () => {
      const result = await leaveOrganizationAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <UsersHeader
        currentRole={currentRole}
        organizationName={organizationName}
        onAdd={() => setShowAdd(true)}
        onLeave={leaveOrganization}
        pending={pending}
      />
      {error && <p className={styles.errorBanner} role="alert">{error}</p>}
      <UsersStats users={users} />
      <section className={styles.listPanel}>
        <UsersFilterBar
          search={search}
          role={roleFilter}
          onSearch={setSearch}
          onRole={setRoleFilter}
          onClear={() => {
            setSearch("");
            setRoleFilter("");
          }}
        />
        <UsersTable
          users={filtered}
          total={users.length}
          currentRole={currentRole}
          currentUserId={currentUserId}
          onRemove={removeUser}
          onChangeRole={changeRole}
        />
      </section>
      {showAdd && (
        <AddUserModal
          currentRole={currentRole}
          existingEmails={users.map((u) => u.email.toLowerCase())}
          onClose={() => setShowAdd(false)}
          onInvite={inviteUser}
        />
      )}
    </>
  );
}
