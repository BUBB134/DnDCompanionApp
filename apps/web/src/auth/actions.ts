"use server";

import { redirect } from "next/navigation";
import { redirectToProtectedPath } from "@/auth/redirect";
import { createLocalAuthSession, getSafeReturnPath } from "@/auth/session";
import { clearAuthSessionCookie, setAuthSessionCookie } from "@/auth/server";

export async function signInAction(formData: FormData) {
  const session = createLocalAuthSession({
    email: getStringField(formData, "email"),
    name: getStringField(formData, "displayName"),
  });
  const nextPath = getSafeReturnPath(getStringField(formData, "next"));

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
