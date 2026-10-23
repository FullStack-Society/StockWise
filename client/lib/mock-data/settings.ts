// Sample data for the Settings page. Replace with API/database calls later.

export const profileDefaults = {
  position: "Store Manager",
  timezone: "GMT -05:00 Eastern Time",
  joined: "October 2023",
};

export const TIMEZONES = [
  "GMT -08:00 Pacific Time",
  "GMT -06:00 Central Time",
  "GMT -05:00 Eastern Time",
  "GMT +00:00 London",
  "GMT +01:00 Central European Time",
  "GMT +08:00 Philippines / Singapore",
];

export type PreferenceItem = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

export const preferenceItems: PreferenceItem[] = [
  {
    id: "2fa",
    title: "Two-Factor Authentication",
    description: "Add an extra layer of security to your account.",
    enabled: true,
  },
  {
    id: "desktop",
    title: "Desktop Notifications",
    description: "Get real-time alerts for low stock and critical items.",
    enabled: false,
  },
  {
    id: "autosync",
    title: "Auto-Sync Reports",
    description: "Automatically refresh analytics every 15 minutes.",
    enabled: true,
  },
];

export const accountHealth = { percent: 85, hint: "Add phone number" };

export const settingsFooterStats = [
  {
    id: "system",
    label: "System Status",
    value: "All Systems Operational",
    icon: "search" as const,
  },
  {
    id: "login",
    label: "Last Login",
    value: "Today, 09:41 AM",
    icon: "eye" as const,
  },
  {
    id: "storage",
    label: "Storage Usage",
    value: "4.2 GB / 10 GB",
    icon: "lock" as const,
  },
];
