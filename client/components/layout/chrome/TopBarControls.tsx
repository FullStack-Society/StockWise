"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bell, Check, ChevronDown, Plus, Trash2, UserRound, X } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import type {
  InvitationNotice,
  OrganizationLeaveNotification,
  OrganizationLoginNotification,
  OrganizationSummary,
} from "@/lib/api/organizations";
import type { SessionUser } from "@/lib/auth/session";
import {
  deleteOrganizationLeaveNotificationAction,
  listOrganizationLoginNotificationsAction,
  markOrganizationLoginNotificationReadAction,
  markOrganizationLeaveNotificationReadAction,
  respondToInvitationAction,
  switchOrganizationAction,
} from "@/lib/organization/actions";
import styles from "@/styles/layout/TopBar.module.css";
import CreateOrganizationDialog from "@/components/features/users/organizations/CreateOrganizationDialog";

type Props = {
  user: SessionUser | null;
  organizations: OrganizationSummary[];
  invitations: InvitationNotice[];
  leaveNotifications: OrganizationLeaveNotification[];
  loginNotifications: OrganizationLoginNotification[];
  invitationsEnabled: boolean;
};

export default function TopBarControls({
  user,
  organizations,
  invitations,
  leaveNotifications,
  loginNotifications: initialLoginNotifications,
  invitationsEnabled,
}: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [message, setMessage] = useState("");
  const [organizationError, setOrganizationError] = useState("");
  const [pendingInvitations, setPendingInvitations] = useState(invitations);
  const [activityNotifications, setActivityNotifications] =
    useState(leaveNotifications);
  const [loginNotifications, setLoginNotifications] = useState(
    initialLoginNotifications,
  );
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<
    Set<number>
  >(() => new Set());
  const [pending, startTransition] = useTransition();
  const visibleInvitations = invitationsEnabled ? pendingInvitations : [];
  const activeOrganization = organizations.find(
    (organization) => organization.organization_id === user?.organizationId,
  );
  const canReceiveLoginNotifications =
    activeOrganization?.role === "owner" || activeOrganization?.role === "manager";
  const visibleLoginNotifications = canReceiveLoginNotifications
    ? loginNotifications
    : [];
  const unreadLoginCount = visibleLoginNotifications.filter(
    (notification) => !notification.read_at,
  ).length;
  const unreadCount = activityNotifications.filter(
    (notification) => !notification.read_at,
  ).length + unreadLoginCount;
  const notificationCount = visibleInvitations.length + unreadCount;

  useEffect(() => {
    if (!user || !activeOrganization || !canReceiveLoginNotifications) return;
    let active = true;
    let inFlight = false;
    const refreshLoginNotifications = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const notifications = await listOrganizationLoginNotificationsAction();
        if (active) setLoginNotifications(notifications);
      } catch {
        // Keep the most recent notification state and retry on the next poll.
      } finally {
        inFlight = false;
      }
    };
    void refreshLoginNotifications();
    const timer = window.setInterval(
      () => void refreshLoginNotifications(),
      20_000,
    );
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user, activeOrganization, canReceiveLoginNotifications]);
  const selectedUnreadCount = activityNotifications.filter(
    (notification) =>
      selectedNotificationIds.has(notification.notification_id) &&
      !notification.read_at,
  ).length;

  function toggleNotificationSelection(notificationId: number) {
    setSelectedNotificationIds((current) => {
      const next = new Set(current);
      if (next.has(notificationId)) next.delete(notificationId);
      else next.add(notificationId);
      return next;
    });
  }

  function toggleSelectAllNotifications() {
    setSelectedNotificationIds((current) =>
      current.size === activityNotifications.length
        ? new Set()
        : new Set(activityNotifications.map((item) => item.notification_id)),
    );
  }

  function markRead(notificationId: number) {
    setMessage("");
    startTransition(async () => {
      const result =
        await markOrganizationLeaveNotificationReadAction(notificationId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setActivityNotifications((current) =>
        current.map((notification) =>
          notification.notification_id === notificationId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
      );
    });
  }

  function markLoginNotificationRead(notificationId: number) {
    setMessage("");
    startTransition(async () => {
      const result =
        await markOrganizationLoginNotificationReadAction(notificationId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setLoginNotifications((current) =>
        current.map((notification) =>
          notification.notification_id === notificationId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
      );
    });
  }

  function markSelectedRead() {
    const ids = activityNotifications
      .filter(
        (notification) =>
          selectedNotificationIds.has(notification.notification_id) &&
          !notification.read_at,
      )
      .map((notification) => notification.notification_id);
    if (ids.length === 0) return;
    setMessage("");
    startTransition(async () => {
      const results = await Promise.all(
        ids.map((id) => markOrganizationLeaveNotificationReadAction(id)),
      );
      const succeeded = new Set(
        ids.filter((_, index) => results[index]?.ok),
      );
      if (succeeded.size !== ids.length) {
        const failedResult = results.find((result) => !result.ok);
        setMessage(
          failedResult && !failedResult.ok
            ? failedResult.error
            : "Some notifications could not be marked as read.",
        );
      }
      setActivityNotifications((current) =>
        current.map((notification) =>
          succeeded.has(notification.notification_id)
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
      );
      setSelectedNotificationIds(new Set());
    });
  }

  function deleteNotification(notificationId: number) {
    setMessage("");
    startTransition(async () => {
      const result =
        await deleteOrganizationLeaveNotificationAction(notificationId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setActivityNotifications((current) =>
        current.filter((item) => item.notification_id !== notificationId),
      );
      setSelectedNotificationIds((current) => {
        const next = new Set(current);
        next.delete(notificationId);
        return next;
      });
    });
  }

  function deleteSelectedNotifications() {
    const ids = activityNotifications
      .filter((notification) =>
        selectedNotificationIds.has(notification.notification_id),
      )
      .map((notification) => notification.notification_id);
    if (ids.length === 0) return;
    setMessage("");
    startTransition(async () => {
      const results = await Promise.all(
        ids.map((id) => deleteOrganizationLeaveNotificationAction(id)),
      );
      const succeeded = new Set(
        ids.filter((_, index) => results[index]?.ok),
      );
      if (succeeded.size !== ids.length) {
        const failedResult = results.find((result) => !result.ok);
        setMessage(
          failedResult && !failedResult.ok
            ? failedResult.error
            : "Some notifications could not be deleted.",
        );
      }
      setActivityNotifications((current) =>
        current.filter((item) => !succeeded.has(item.notification_id)),
      );
      setSelectedNotificationIds(new Set());
    });
  }

  function respond(invitationId: number, accept: boolean) {
    setMessage("");
    startTransition(async () => {
      const result = await respondToInvitationAction(invitationId, accept);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      if (accept) {
        window.location.reload();
      } else {
        setPendingInvitations((current) =>
          current.filter((invitation) => invitation.invitation_id !== invitationId),
        );
      }
    });
  }

  function changeOrganization(value: string) {
    const organizationId = Number(value);
    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      setOrganizationError("Select a valid organization.");
      return;
    }
    setOrganizationError("");
    startTransition(async () => {
      const result = await switchOrganizationAction(organizationId);
      if (!result.ok) setOrganizationError(result.error);
      else window.location.reload();
    });
  }

  return (
    <div className={styles.right}>
      {user && (
        <button
          type="button"
          className={styles.createOrgButton}
          onClick={() => setShowCreateOrganization(true)}
          aria-label="Create organization"
        >
          <Plus size={15} aria-hidden />
          <span>Create organization</span>
        </button>
      )}
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
          {organizationError && (
            <span className={styles.organizationSwitchError} role="alert">
              {organizationError}
            </span>
          )}
        </label>
      )}

      {(invitationsEnabled ||
        activityNotifications.length > 0 ||
        visibleLoginNotifications.length > 0) && (
        <div className={styles.notificationWrap}>
          <button
            type="button"
            className={styles.bell}
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} new` : ""}`}
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((shown) => !shown)}
          >
            <Bell size={16} />
            {notificationCount > 0 && (
              <span className={styles.notificationCount}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <section
              className={styles.notificationPanel}
              aria-label="Notifications"
            >
              <div className={styles.notificationHead}>
                <h2>Notifications</h2>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close notifications"
                  className={styles.closeNotifications}
                >
                  <X size={15} />
                </button>
              </div>
              {activityNotifications.length > 0 && (
                <div className={styles.notificationBulkActions}>
                  <label className={styles.selectAllNotifications}>
                    <input
                      type="checkbox"
                      checked={
                        activityNotifications.length > 0 &&
                        selectedNotificationIds.size ===
                          activityNotifications.length
                      }
                      onChange={toggleSelectAllNotifications}
                      disabled={pending}
                    />
                    Select all
                  </label>
                  <button
                    type="button"
                    onClick={markSelectedRead}
                    disabled={pending || selectedUnreadCount === 0}
                  >
                    <Check size={13} /> Mark as read
                  </button>
                  <button
                    type="button"
                    className={styles.deleteNotifications}
                    onClick={deleteSelectedNotifications}
                    disabled={pending || selectedNotificationIds.size === 0}
                  >
                    <Trash2 size={13} /> Delete selected
                  </button>
                </div>
              )}
              {message && (
                <p role="alert" className={styles.notificationError}>
                  {message}
                </p>
              )}
              {visibleInvitations.length === 0 &&
              visibleLoginNotifications.length === 0 &&
              activityNotifications.length === 0 ? (
                <p className={styles.noNotifications}>You’re all caught up.</p>
              ) : (
                <ul className={styles.invitationList}>
                  {visibleLoginNotifications.map((notification) => (
                    <li
                      key={`login-${notification.notification_id}`}
                      className={styles.invitationItem}
                    >
                      <p>
                        <strong>{notification.actor_name}</strong> signed in to{" "}
                        <strong>{activeOrganization?.organization_name ?? "this organization"}</strong>.
                      </p>
                      <span className={styles.invitedBy}>
                        {notification.actor_role} · {new Date(notification.created_at).toLocaleString()}
                      </span>
                      {!notification.read_at && (
                        <div className={styles.invitationActions}>
                          <button
                            type="button"
                            onClick={() => markLoginNotificationRead(notification.notification_id)}
                            disabled={pending}
                          >
                            <Check size={13} /> Mark as read
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                  {visibleInvitations.map((invitation) => (
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
                        <button
                          type="button"
                          className={styles.deleteInvitation}
                          onClick={() =>
                            respond(invitation.invitation_id, false)
                          }
                          disabled={pending}
                          aria-label={`Delete invitation notification from ${invitation.invited_by_email}; this declines the invitation`}
                          title="Delete notification and decline invitation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                  {activityNotifications.map((notification) => (
                    <li
                      key={notification.notification_id}
                      className={styles.invitationItem}
                    >
                      <div className={styles.notificationItemTop}>
                        <label className={styles.notificationCheckbox}>
                          <input
                            type="checkbox"
                            aria-label={`Select notification from ${notification.actor_name}`}
                            checked={selectedNotificationIds.has(
                              notification.notification_id,
                            )}
                            onChange={() =>
                              toggleNotificationSelection(
                                notification.notification_id,
                              )
                            }
                            disabled={pending}
                          />
                        </label>
                        <div className={styles.notificationItemCopy}>
                          <p>
                            <strong>{notification.actor_name}</strong> left{" "}
                            <strong>{notification.organization_name}</strong>.
                          </p>
                          <span className={styles.invitedBy}>
                            {notification.actor_email}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.deleteNotification}
                          onClick={() =>
                            deleteNotification(notification.notification_id)
                          }
                          disabled={pending}
                          aria-label={`Delete notification from ${notification.actor_name}`}
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {!notification.read_at && (
                        <div className={styles.invitationActions}>
                          <button
                            type="button"
                            onClick={() =>
                              markRead(notification.notification_id)
                            }
                            disabled={pending}
                          >
                            <Check size={13} /> Mark as read
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      <Link
        href={`${ROUTES.settings}?section=profile`}
        className={styles.user}
        aria-label="Open profile settings"
      >
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
      </Link>
      {showCreateOrganization && (
        <CreateOrganizationDialog
          onClose={() => setShowCreateOrganization(false)}
        />
      )}
    </div>
  );
}
