import type { AccountSettings } from "@/lib/api/settings";
import { Monitor, Moon, Sun } from "lucide-react";

export type EditablePreferences = Pick<
  AccountSettings,
  | "invitation_notifications"
  | "theme"
  | "date_format"
  | "currency"
  | "density"
  | "auto_sync_reports"
  | "prioritize_low_stock"
>;

export const DEFAULT_PREFERENCES: EditablePreferences = {
  invitation_notifications: true,
  theme: "dark",
  date_format: "mdy",
  currency: "USD",
  density: "comfortable",
  auto_sync_reports: false,
  prioritize_low_stock: false,
};

export const TIMEZONES = [
  ["Asia/Manila", "Philippines (Asia/Manila)"],
  ["Asia/Singapore", "Singapore (Asia/Singapore)"],
  ["America/Los_Angeles", "Pacific Time (US)"],
  ["America/Chicago", "Central Time (US)"],
  ["America/New_York", "Eastern Time (US)"],
  ["Europe/London", "United Kingdom (Europe/London)"],
  ["Europe/Berlin", "Central Europe (Europe/Berlin)"],
  ["UTC", "UTC"],
] as const;

export const NOTIFICATION_EVENTS = [
  "Low stock alerts",
  "New orders",
  "Weekly reports",
  "Team activity",
  "Organization invitations",
  "System updates",
] as const;

export const THEMES: {
  label: string;
  theme: EditablePreferences["theme"];
  icon: typeof Moon;
  sample: string;
}[] = [
  { label: "Dark", theme: "dark", icon: Moon, sample: "sampleDark" },
  { label: "Light", theme: "light", icon: Sun, sample: "sampleLight" },
  { label: "System", theme: "system", icon: Monitor, sample: "sampleSystem" },
];
