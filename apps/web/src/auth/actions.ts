"use server";

import { redirect } from "next/navigation";
import {
  getAuthAppBaseUrl,
  getAuthProvider,
  isSupabaseAuthConfigured,
} from "@/auth/config";
import { redirectToProtectedPath } from "@/auth/redirect";
import {
  canCreateAuthSessionToken,
  createLocalAuthSession,
  getSafeReturnPath,
} from "@/auth/session";
import { clearAuthSessionCookie, setAuthSessionCookie } from "@/auth/server";
import { createSupabaseServerClient } from "@/auth/supabase/server";
import { normalizeLocalAuthName } from "@/auth/local-user";

export async function signInAction(formData: FormData) {
  const nextPath = getSafeReturnPath(getStringField(formData, "next"));

  if (getAuthProvider() === "supabase") {
    await signInWithSupabase(formData, nextPath);
    return;
  }

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

export async function signUpAction(formData: FormData) {
  const nextPath = getSafeReturnPath(getStringField(formData, "next"));

  if (getAuthProvider() !== "supabase" || !isSupabaseAuthConfigured()) {
    redirectToSignIn(nextPath, { error: "configuration" });
  }

  const email = getStringField(formData, "email");
  const password = getStringField(formData, "password");
  const displayName = normalizeLocalAuthName(
    getStringField(formData, "displayName"),
  );

  if (!email || !password || password.length < 8 || !displayName) {
    redirectToSignIn(nextPath, { error: "sign-up" });
  }

  const appBaseUrl = getAuthAppBaseUrl();

  if (!appBaseUrl) {
    redirectToSignIn(nextPath, { error: "configuration" });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${appBaseUrl}/auth/callback?${new URLSearchParams({
        next: nextPath,
      })}`,
    },
  });

  if (error) {
    console.warn("Supabase sign-up failed.", { code: error.code });
    redirectToSignIn(nextPath, { error: "sign-up" });
  }

  if (data.session) {
    redirectToProtectedPath(nextPath);
  }

  redirectToSignIn(nextPath, { message: "check-email" });
}

export async function requestPasswordResetAction(formData: FormData) {
  if (getAuthProvider() !== "supabase" || !isSupabaseAuthConfigured()) {
    redirect("/forgot-password?error=configuration");
  }

  const email = getStringField(formData, "email");
  const appBaseUrl = getAuthAppBaseUrl();

  if (!email || !appBaseUrl) {
    redirect("/forgot-password?error=recovery");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appBaseUrl}/auth/callback?${new URLSearchParams({
      next: "/update-password",
    })}`,
  });

  if (error) {
    console.warn("Supabase password recovery request failed.", {
      code: error.code,
    });
  }

  redirect("/forgot-password?message=recovery-sent");
}

export async function updatePasswordAction(formData: FormData) {
  if (getAuthProvider() !== "supabase" || !isSupabaseAuthConfigured()) {
    redirect("/update-password?error=configuration");
  }

  const password = getStringField(formData, "password");
  const passwordConfirmation = getStringField(
    formData,
    "passwordConfirmation",
  );

  if (
    !password ||
    password.length < 8 ||
    password !== passwordConfirmation
  ) {
    redirect("/update-password?error=password");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.warn("Supabase password update failed.", { code: error.code });
    redirect("/update-password?error=password");
  }

  await supabase.auth.signOut();
  await clearAuthSessionCookie();
  redirect("/sign-in?message=password-updated");
}

export async function signOutAction() {
  if (getAuthProvider() === "supabase" && isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.warn("Supabase sign-out failed.", { code: error.code });
    }
  }

  await clearAuthSessionCookie();
  redirect("/sign-in");
}

async function signInWithSupabase(
  formData: FormData,
  nextPath: ReturnType<typeof getSafeReturnPath>,
) {
  if (!isSupabaseAuthConfigured()) {
    redirectToSignIn(nextPath, { error: "configuration" });
  }

  const email = getStringField(formData, "email");
  const password = getStringField(formData, "password");

  if (!email || !password) {
    redirectToSignIn(nextPath, { error: "invalid-credentials" });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.warn("Supabase sign-in failed.", { code: error.code });
    redirectToSignIn(nextPath, { error: "invalid-credentials" });
  }

  redirectToProtectedPath(nextPath);
}

function redirectToSignIn(
  nextPath: ReturnType<typeof getSafeReturnPath>,
  state: { error?: string; message?: string },
): never {
  redirect(
    `/sign-in?${new URLSearchParams({
      ...(state.error ? { error: state.error } : {}),
      ...(state.message ? { message: state.message } : {}),
      next: nextPath,
    })}`,
  );
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : undefined;
}
