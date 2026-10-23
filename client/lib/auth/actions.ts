"use server";

import { redirect } from "next/navigation";
import { ROUTES } from "@/app/routes";
import { createSession, deleteSession } from "./session";
import { verifyCredentials } from "./users";

export type LoginState = { error?: string; email?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return { error: "Invalid email or password.", email };
  }

  await createSession(user, remember);
  redirect(ROUTES.dashboard);
}

export async function logout() {
  await deleteSession();
  redirect(ROUTES.login);
}
