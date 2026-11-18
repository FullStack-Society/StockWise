import type { Pool, QueryResultRow } from "pg";
import type { OrganizationId } from "../types/organizations.js";

export interface OrganizationDbRow extends QueryResultRow {}

export const organizationsModel = {
  recordPresence: (pool: Pool, org: number, email: string) =>
    pool.query("CALL public.stockwise_record_organization_presence($1, $2)", [
      org,
      email,
    ]),
  notifyMemberLogin: (pool: Pool, org: number, email: string, role: string) =>
    pool.query(
      "CALL public.stockwise_notify_organization_member_login($1, $2, $3)",
      [org, email, role],
    ),
  getLoginNotifications: (pool: Pool, org: number, email: string) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.stockwise_get_organization_login_notifications($1, $2)",
      [org, email],
    ),
  markLoginNotificationRead: (
    pool: Pool,
    id: OrganizationId,
    org: number,
    email: string,
  ) =>
    pool.query<{ p_marked: boolean }>(
      "CALL public.stockwise_mark_organization_login_notification_read($1, $2, $3, NULL)",
      [id, org, email],
    ),
  create: (pool: Pool, email: string, name: string) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.org_create_organization($1, $2)",
      [email, name],
    ),
  listMine: (pool: Pool, email: string) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.org_get_my_organizations($1)",
      [email],
    ),
  getLeaveNotifications: (pool: Pool, email: string) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.org_get_leave_notifications($1)",
      [email],
    ),
  markLeaveNotificationRead: (pool: Pool, id: OrganizationId, email: string) =>
    pool.query<{ marked: boolean }>(
      "SELECT public.org_mark_leave_notification_read($1, $2) AS marked",
      [id, email],
    ),
  deleteLeaveNotification: (pool: Pool, id: OrganizationId, email: string) =>
    pool.query<{ deleted: boolean }>(
      "SELECT public.org_delete_leave_notification($1, $2) AS deleted",
      [id, email],
    ),
  rename: (pool: Pool, id: OrganizationId, email: string, name: string) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.org_rename_organization($1, $2, $3)",
      [id, email, name],
    ),
  transferOwnership: (
    pool: Pool,
    id: OrganizationId,
    actor: string,
    target: string,
  ) =>
    pool.query<{ transferred: boolean }>(
      "SELECT public.org_transfer_ownership($1, $2, $3) AS transferred",
      [id, actor, target],
    ),
  delete: (pool: Pool, id: OrganizationId, email: string) =>
    pool.query<{ deleted: boolean }>(
      "SELECT public.org_delete_organization($1, $2) AS deleted",
      [id, email],
    ),
  getPendingInvitations: (pool: Pool, email: string) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.org_get_pending_invitations($1)",
      [email],
    ),
  respondToInvitation: (
    pool: Pool,
    id: OrganizationId,
    email: string,
    accept: boolean,
  ) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.org_respond_to_invitation($1, $2, $3)",
      [id, email, accept],
    ),
  listMembers: (pool: Pool, id: OrganizationId, actor: string) =>
    pool.query<OrganizationDbRow>(
      "SELECT * FROM public.org_list_members($1, $2)",
      [id, actor],
    ),
  getPresence: (pool: Pool, id: OrganizationId) =>
    pool.query<{ email: string; online: boolean }>(
      "SELECT * FROM public.stockwise_get_organization_member_presence($1)",
      [id],
    ),
  inviteMember: (
    pool: Pool,
    id: OrganizationId,
    actor: string,
    email: string,
    role: string,
  ) =>
    pool.query<{ invitation_id: string | number }>(
      "SELECT public.org_invite_member($1, $2, $3, $4) AS invitation_id",
      [id, actor, email, role],
    ),
  removeMember: (
    pool: Pool,
    id: OrganizationId,
    actor: string,
    email: string,
  ) =>
    pool.query<{ removed: boolean }>(
      "SELECT public.org_remove_member($1, $2, $3) AS removed",
      [id, actor, email],
    ),
  leave: (pool: Pool, id: OrganizationId, email: string) =>
    pool.query<{ left: boolean }>("SELECT public.org_leave($1, $2) AS left", [
      id,
      email,
    ]),
  changeMemberRole: (
    pool: Pool,
    id: OrganizationId,
    actor: string,
    member: string,
    role: string,
  ) =>
    pool.query<{ changed: boolean }>(
      "SELECT public.org_change_member_role($1, $2, $3, $4) AS changed",
      [id, actor, member, role],
    ),
};
