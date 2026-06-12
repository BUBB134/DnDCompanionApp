import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession } from "@dnd/types";
import { getAuthProvider, getSupabaseAuthConfig } from "@/auth/config";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  createSupabaseAuthSession,
  decodeAuthSession,
  encodeAuthSession,
} from "@/auth/session";
import { createSupabaseServerClient } from "@/auth/supabase/server";

export async function getAuthSession() {
  if (getAuthProvider() === "supabase") {
    return getSupabaseAuthSession();
  }

  const cookieStore = await cookies();

  return decodeAuthSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function requireAuthSession() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function setAuthSessionCookie(session: AuthSession) {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    name: AUTH_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: await encodeAuthSession(session),
  });
}

export async function clearAuthSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: 0,
    name: AUTH_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: "",
  });
}

async function getSupabaseAuthSession() {
  if (!getSupabaseAuthConfig()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return createSupabaseAuthSession(data.claims);
}
