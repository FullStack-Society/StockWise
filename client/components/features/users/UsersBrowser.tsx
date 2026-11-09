"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/auth/roles";
import { canManageUser } from "@/lib/auth/roles";
import type { TeamUser } from "@/lib/users/types";
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
import AddUserModal from "@/components/features/users/modals/AddUserModal";
import styles from "@/styles/users/UsersBrowser.module.css";
import { formatDate } from "@/lib/utils/format";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import DestructiveConfirmationModal from "@/components/ui/DestructiveConfirmationModal";

type Props = {
  currentRole: Role;
  currentUserId: string;
  organizationName: string;
  initialMembers: OrganizationMember[];
};

function toTeamUser(
  member: OrganizationMember,
  dateFormat: "mdy" | "dmy" | "ymd",
): TeamUser {
  return {
    id: member.email.toLowerCase(),
    name: member.full_name,
    email: member.email,
    role: member.role,
    status: member.status,
    presenceStatus: member.online_status,
    joinedAt: member.joined_at
      ? formatDate(member.joined_at, dateFormat)
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
  const { date_format: dateFormat } = useUserPreferences();
  const users = useMemo(
    () => initialMembers.map((member) => toTeamUser(member, dateFormat)),
    [initialMembers, dateFormat],
  );
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [router]);

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
  const userPageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / userPageSize));
  const currentPage = Math.min(userPage, pageCount);
  const start = (currentPage - 1) * userPageSize;
  const visibleUsers = filtered.slice(start, start + userPageSize);

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
    const isInvited = target.status === "Invited";
    setConfirmation({
      title: isInvited ? "Revoke invitation?" : "Remove organization member?",
      description: isInvited
        ? `Revoke the invitation for ${target.email}?`
        : `Remove ${target.name} from ${organizationName}? They will lose access to this organization.`,
      confirmLabel: isInvited ? "Revoke invitation" : "Remove member",
      onConfirm: () => {
        setError("");
        startTransition(async () => {
          const result = await removeOrganizationMemberAction(target.email);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      },
    });
  }

  function changeRole(id: string, role: Role) {
    const target = users.find((u) => u.id === id);
    if (!target || (role !== "manager" && role !== "staff")) return;
    startTransition(async () => {
      const result = await changeOrganizationRoleAction(target.email, role);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function leaveOrganization() {
    setConfirmation({
      title: "Leave organization?",
      description: `Leave ${organizationName}? You will lose access to its inventory.`,
      confirmLabel: "Leave organization",
      onConfirm: () => {
        startTransition(async () => {
          const result = await leaveOrganizationAction();
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      },
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
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
      <UsersStats users={users} />
      <section className={styles.listPanel}>
        <UsersFilterBar
          search={search}
          role={roleFilter}
          onSearch={(value) => {
            setSearch(value);
            setUserPage(1);
          }}
          onRole={(value) => {
            setRoleFilter(value);
            setUserPage(1);
          }}
          onClear={() => {
            setSearch("");
            setRoleFilter("");
            setUserPage(1);
          }}
        />
        <UsersTable
          users={visibleUsers}
          total={filtered.length}
          start={start}
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setUserPage}
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
      {confirmation && (
        <DestructiveConfirmationModal
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          isPending={pending}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            const action = confirmation.onConfirm;
            setConfirmation(null);
            action();
          }}
        />
      )}
    </>
  );
}
