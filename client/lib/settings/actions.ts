"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { deleteSession, requireSession } from "@/lib/auth/session";
import {
  softDeleteCurrentAccount,
  updateAccountPreferences,
  updateAccountProfile,
} from "@/lib/api/settings";

const TIMEZONES = new Set([
  "Asia/Manila",
  "Asia/Singapore",
  "America/Los_Angeles",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
]);

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

export async function saveProfileSettings(input: {
  timezone: string;
}): Promise<SettingsActionResult> {
  const session = await requireSession();
  const timezone = String(input?.timezone ?? "");
  if (!TIMEZONES.has(timezone)) {
    return { ok: false, error: "Choose a valid timezone." };
  }
  try {
    await updateAccountProfile(session.email, { timezone });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not save your profile settings. Try again.",
    };
  }
}

export async function savePreferences(input: {
  invitation_notifications: boolean;
}): Promise<SettingsActionResult> {
  const session = await requireSession();
  if (typeof input?.invitation_notifications !== "boolean") {
    return { ok: false, error: "The preference values are invalid." };
  }
  try {
    await updateAccountPreferences(session.email, input);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save your preferences. Try again." };
  }
}

export async function deleteMyAccount(): Promise<SettingsActionResult> {
  await requireSession();
  try {
    await softDeleteCurrentAccount();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not delete your account. Try again.",
    };
  }
  await deleteSession();
  redirect("/login?accountDeleted=1");
}
