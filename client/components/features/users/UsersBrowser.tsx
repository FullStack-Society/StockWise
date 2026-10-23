"use client";

import { useMemo, useState } from "react";
import type { Role } from "@/lib/auth/roles";
import { canManageUser } from "@/lib/auth/roles";
import { initialUsers, type TeamUser } from "@/lib/mock-data/users";
import UsersHeader from "./UsersHeader";
import UsersStats from "./UsersStats";
import UsersFilterBar from "./UsersFilterBar";
import UsersTable from "./UsersTable";
import AddUserModal from "./AddUserModal";
import styles from "@/styles/users/UsersBrowser.module.css";

type Props = { currentRole: Role; currentUserId: string };

export default function UsersBrowser({ currentRole, currentUserId }: Props) {
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

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

  function addUser(user: TeamUser) {
    // Placeholder: replace with a Server Action that creates the user and emails the invite.
    setUsers((list) => [user, ...list]);
    setShowAdd(false);
  }

  function removeUser(id: string) {
    const target = users.find((u) => u.id === id);
    if (!target || !canManageUser(currentRole, target.role)) return;
    if (
      !window.confirm(
        `Remove ${target.name}? They will lose access to this account.`,
      )
    )
      return;
    // Placeholder: replace with a Server Action. Always re-check permissions on the server.
    setUsers((list) => list.filter((u) => u.id !== id));
  }

  function changeRole(id: string, role: Role) {
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  return (
    <>
      <UsersHeader currentRole={currentRole} onAdd={() => setShowAdd(true)} />
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
          onAdd={addUser}
        />
      )}
    </>
  );
}
