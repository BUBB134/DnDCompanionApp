import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { AuthSession } from "@dnd/types";
import { cache } from "react";
import { getAuthProvider, isClerkAuthConfigured } from "@/auth/config";
import { resolveClerkAuthUser } from "@/auth/identity";
import { redirectToSignIn } from "@/auth/redirect";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  createManagedAuthSession,
  decodeAuthSession,
  encodeAuthSession,
} from "@/auth/session";

export const getAuthSession = cache(async () => {
  if (getAuthProvider() === "clerk") {
    return getClerkAuthSession();
  }

  const cookieStore = await cookies();

  return decodeAuthSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
});

export async function requireAuthSession() {
  const session = await getAuthSession();

  if (!session) {
    redirectToSignIn();
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

async function getClerkAuthSession() {
  if (!isClerkAuthConfigured()) {
    return null;
  }

  const { sessionClaims, userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  if (!user || user.id !== userId) {
    return null;
  }

  const email = getPrimaryEmail(user);

  if (!email) {
    return null;
  }

  const authUser = await resolveClerkAuthUser({
    clerkUserId: user.id,
    email,
    name: getClerkDisplayName(user, email),
  });

  return createManagedAuthSession(authUser, sessionClaims.exp);
}

function getPrimaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const primaryEmail = user.emailAddresses.find(
    (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
  );

  return primaryEmail?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

function getClerkDisplayName(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
  email: string,
) {
  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email.split("@")[0];

  return name || "Adventurer";
}
