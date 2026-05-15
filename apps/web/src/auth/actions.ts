"use server";

import { redirect } from "next/navigation";
import { redirectToProtectedPath } from "@/auth/redirect";
import {
  canCreateAuthSessionToken,
  createLocalAuthSession,
  getSafeReturnPath,
} from "@/auth/session";
import { clearAuthSessionCookie, setAuthSessionCookie } from "@/auth/server";

export async function signInAction(formData: FormData) {
  const nextPath = getSafeReturnPath(getStringField(formData, "next"));

  if (!canCreateAuthSessionToken()) {
    console.error(
      "Sign-in is unavailable because AUTH_SESSION_SECRET is not configured for this environment.",
    );
    redirect(
      `/sign-in?${new URLSearchParams({
        error: "configuration",
        next: nextPath,
      })}`,
    );
  }

  const session = createLocalAuthSession({
    email: getStringField(formData, "email"),
    name: getStringField(formData, "displayName"),
  });

  await setAuthSessionCookie(session);
  redirectToProtectedPath(nextPath);
}

export async function signOutAction() {
  await clearAuthSessionCookie();
  redirect("/sign-in");
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : undefined;
}
