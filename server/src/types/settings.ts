import type { Request, Response } from "express";
import type { PoolClient } from "pg";

export type {
  Avatar,
  AvatarInput,
  Code,
  CodeInput,
  Consent,
  ConsentInput,
  InventoryDefaults,
  InventoryDefaultsInput,
  Password,
  PasswordInput,
  Preferences,
  PreferencesInput,
  Profile,
  ProfileInput,
  SecurityPreferences,
  SecurityPreferencesInput,
} from "../schemas/settings.schema.js";
export type {
  MfaSettingsRow,
  SettingsRecord,
  UserSettingsRow,
} from "../models/settings.js";

export type SettingsRequest = Request & { actorEmail: string };

export type SettingsHandler = (
  req: SettingsRequest,
  res: Response,
  client: PoolClient,
) => Promise<void>;
