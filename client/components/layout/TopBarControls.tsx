"use client";

import { useState, useTransition } from "react";
import { Bell, Check, ChevronDown, UserRound, X } from "lucide-react";
import type {
  InvitationNotice,
  OrganizationSummary,
} from "@/lib/api/organizations";
import type { SessionUser } from "@/lib/auth/session";
import {
  respondToInvitationAction,
  switchOrganizationAction,
} from "@/lib/organization/actions";
import styles from "@/styles/layout/TopBar.module.css";

type Props = {
  user: SessionUser | null;
  organizations: OrganizationSummary[];
  invitations: InvitationNotice[];
  invitationsEnabled: boolean;
};

export default function TopBarControls({
  user,
  organizations,
  invitations,
  invitationsEnabled,
}: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const activeOrganization = organizations.find(
    (organization) => organization.organization_id === user?.organizationId,
  );

  function respond(invitationId: number, accept: boolean) {
    setMessage("");
    startTransition(async () => {
      const result = await respondToInvitationAction(invitationId, accept);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function changeOrganization(value: string) {
    const organizationId = Number(value);
    if (!Number.isInteger(organizationId) || organizationId <= 0) return;
    startTransition(async () => {
      const result = await switchOrganizationAction(organizationId);
      if (!result.ok) setMessage(result.error);
      else window.location.reload();
    });
  }

  return (
    <div className={styles.right}>
      {organizations.length > 0 && (
        <label className={styles.organizationSelectWrap}>
          <span className={styles.srOnly}>Active organization</span>
          <select
            className={styles.organizationSelect}
            value={activeOrganization?.organization_id ?? ""}
            onChange={(event) => changeOrganization(event.target.value)}
            disabled={pending}
          >
            <option value="" disabled>
              Choose organization
            </option>
            {organizations.map((organization) => (
              <option
                key={organization.organization_id}
                value={organization.organization_id}
              >
                {organization.organization_name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} aria-hidden />
        </label>
      )}

      {invitationsEnabled && (
        <div className={styles.notificationWrap}>
          <button
            type="button"
            className={styles.bell}
            aria-label={`Notifications${invitations.length ? `, ${invitations.length} pending invitations` : ""}`}
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((shown) => !shown)}
          >
            <Bell size={16} />
            {invitations.length > 0 && (
              <span className={styles.notificationCount}>
                {invitations.length > 9 ? "9+" : invitations.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <section
              className={styles.notificationPanel}
              aria-label="Invitations"
            >
              <div className={styles.notificationHead}>
                <h2>Invitations</h2>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close invitations"
                  className={styles.closeNotifications}
                >
                  <X size={15} />
                </button>
              </div>
              {message && (
                <p role="alert" className={styles.notificationError}>
                  {message}
                </p>
              )}
              {invitations.length === 0 ? (
                <p className={styles.noNotifications}>You’re all caught up.</p>
              ) : (
                <ul className={styles.invitationList}>
                  {invitations.map((invitation) => (
                    <li
                      key={invitation.invitation_id}
                      className={styles.invitationItem}
                    >
                      <p>
                        Join <strong>{invitation.organization_name}</strong> as{" "}
                        {invitation.role}?
                      </p>
                      <span className={styles.invitedBy}>
                        Invited by {invitation.invited_by_email}
                      </span>
                      <div className={styles.invitationActions}>
                        <button
                          type="button"
                          onClick={() =>
                            respond(invitation.invitation_id, true)
                          }
                          disabled={pending}
                        >
                          <Check size={13} /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            respond(invitation.invitation_id, false)
                          }
                          disabled={pending}
                        >
                          <X size={13} /> Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      <div className={styles.user}>
        <div className={styles.avatar}>
          <UserRound size={18} />
        </div>
        <div className={styles.userText}>
          <p className={styles.userName}>{user?.name}</p>
          <p className={styles.userRole}>
            {activeOrganization
              ? `${activeOrganization.role} · ${activeOrganization.organization_name}`
              : organizations.length > 0
                ? "Choose an organization"
                : "No organization"}
          </p>
        </div>
      </div>
    </div>
  );
}
