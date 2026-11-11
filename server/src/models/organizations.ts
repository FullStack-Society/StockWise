import type { QueryResultRow } from "pg";

export type OrganizationId = number | string;

export interface OrganizationRow extends QueryResultRow {
  organization_id: number | string;
  organization_name?: string;
  role?: string | null;
}

export interface OrganizationNotificationRow extends QueryResultRow {
  notification_id: number | string;
  organization_id: number | string;
  message: string;
  created_at: Date | string;
  read_at?: Date | string | null;
}

export type OrganizationRecord = Record<string, unknown>;
