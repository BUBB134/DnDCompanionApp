import type { AuthSession } from "@dnd/types";
import {
  isNonLocalAppEnvironment,
  readPublicEnv,
  readServerEnv,
  type EnvSource,
} from "@dnd/env";
import {
  createLocalUserId,
  DEFAULT_LOCAL_AUTH_EMAIL,
  DEFAULT_LOCAL_AUTH_NAME,
  normalizeLocalAuthEmail,
  normalizeLocalAuthName,
  normalizeLocalAuthUserId,
} from "@/auth/local-user";

export const AUTH_COOKIE_NAME = "dnd_local_session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const AUTH_SESSION_SECRET_MIN_LENGTH = 32;

const PROTECTED_RETURN_PATHS = [
  "/",
  "/campaigns",
  "/entities",
  "/invite",
  "/rules",
  "/sessions",
  "/update-password",
] as const;
const SIGNED_SESSION_TOKEN_PREFIX = "local-v2.";
const UNSIGNED_SESSION_TOKEN_PREFIX = "local-v1.";

type LocalSessionInput = {
  email?: string;
  name?: string;
};

type SupabaseAuthClaims = {
  email?: unknown;
  exp?: unknown;
  sub?: unknown;
  user_metadata?: unknown;
};

export type ProtectedReturnPath = `/${string}`;

export function createLocalAuthSession(
  input: LocalSessionInput = {},
  now = new Date(),
): AuthSession {
  const email = normalizeLocalAuthEmail(input.email) ?? DEFAULT_LOCAL_AUTH_EMAIL;

  return {
    expiresAt: new Date(now.getTime() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000).toISOString(),
    user: {
      email,
      id: createLocalUserId(email),
      name: normalizeLocalAuthName(input.name) ?? DEFAULT_LOCAL_AUTH_NAME,
    },
  };
}

export async function encodeAuthSession(
  session: AuthSession,
  source: EnvSource = process.env,
) {
  const payload = toBase64Url(JSON.stringify(session));
  const sessionSecret = readServerEnv(source).AUTH_SESSION_SECRET;

  if (!sessionSecret) {
    if (requiresSignedAuthSession(source)) {
      throw new Error(
        "AUTH_SESSION_SECRET is required before auth sessions can be created outside local development.",
      );
    }

    return `${UNSIGNED_SESSION_TOKEN_PREFIX}${payload}`;
  }

  return `${SIGNED_SESSION_TOKEN_PREFIX}${payload}.${await signValue(
    payload,
    sessionSecret,
  )}`;
}

export function canCreateAuthSessionToken(source: EnvSource = process.env) {
  const sessionSecret = readServerEnv(source).AUTH_SESSION_SECRET;

  if (sessionSecret && !hasValidAuthSessionSecret(sessionSecret)) {
    return false;
  }

  return !requiresSignedAuthSession(source) || Boolean(sessionSecret);
}

export async function decodeAuthSession(
  cookieValue: string | null | undefined,
  now = new Date(),
  source: EnvSource = process.env,
): Promise<AuthSession | null> {
  if (!cookieValue) {
    return null;
  }

  if (cookieValue.startsWith(SIGNED_SESSION_TOKEN_PREFIX)) {
    const token = cookieValue.slice(SIGNED_SESSION_TOKEN_PREFIX.length);
    const separatorIndex = token.lastIndexOf(".");
    const sessionSecret = readServerEnv(source).AUTH_SESSION_SECRET;

    if (separatorIndex <= 0 || !sessionSecret) {
      return null;
    }

    const payload = token.slice(0, separatorIndex);
    const signature = token.slice(separatorIndex + 1);

    if (!(await hasValidSignature(payload, signature, sessionSecret))) {
      return null;
    }

    return decodeSessionPayload(payload, now);
  }

  if (cookieValue.startsWith(UNSIGNED_SESSION_TOKEN_PREFIX)) {
    if (requiresSignedAuthSession(source)) {
      return null;
    }

    return decodeSessionPayload(
      cookieValue.slice(UNSIGNED_SESSION_TOKEN_PREFIX.length),
      now,
    );
  }

  return null;
}

export async function hasAuthSessionCookie(
  cookieValue: string | null | undefined,
  now = new Date(),
  source: EnvSource = process.env,
) {
  return (await decodeAuthSession(cookieValue, now, source)) !== null;
}

export function createSupabaseAuthSession(
  claims: SupabaseAuthClaims,
): AuthSession | null {
  const email =
    typeof claims.email === "string"
      ? normalizeLocalAuthEmail(claims.email)
      : null;
  const expiresAt =
    typeof claims.exp === "number" && Number.isFinite(claims.exp)
      ? new Date(claims.exp * 1000).toISOString()
      : null;
  const userId = typeof claims.sub === "string" ? claims.sub : null;

  if (!email || !expiresAt || !userId) {
    return null;
  }

  return {
    expiresAt,
    user: {
      email,
      id: userId,
      name: getSupabaseDisplayName(claims.user_metadata, email),
    },
  };
}

function requiresSignedAuthSession(source: EnvSource) {
  return isNonLocalAppEnvironment(readPublicEnv(source).NEXT_PUBLIC_APP_ENV);
}

function hasValidAuthSessionSecret(sessionSecret: string) {
  return sessionSecret.trim().length >= AUTH_SESSION_SECRET_MIN_LENGTH;
}

async function signValue(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return toBase64UrlFromBytes(new Uint8Array(signature));
}

async function hasValidSignature(value: string, signature: string, secret: string) {
  const expectedSignature = await signValue(value, secret);

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let isMatch = true;

  for (let index = 0; index < signature.length; index += 1) {
    if (signature.charCodeAt(index) !== expectedSignature.charCodeAt(index)) {
      isMatch = false;
    }
  }

  return isMatch;
}

function decodeSessionPayload(
  payload: string,
  now: Date,
): AuthSession | null {
  try {
    const decoded = fromBase64Url(payload);
    const session = JSON.parse(decoded) as unknown;

    if (!isAuthSession(session)) {
      return null;
    }

    if (Date.parse(session.expiresAt) <= now.getTime()) {
      return null;
    }

    return normalizeDecodedAuthSession(session);
  } catch {
    return null;
  }
}

export function getSafeReturnPath(
  returnPath: string | null | undefined,
): ProtectedReturnPath {
  if (!returnPath || !returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/";
  }

  const normalizedReturnPath = returnPath as ProtectedReturnPath;

  if (returnPath === "/sign-in" || returnPath.startsWith("/sign-in?")) {
    return "/";
  }

  const pathname = returnPath.split(/[?#]/)[0] ?? "/";
  const matchedPath = PROTECTED_RETURN_PATHS.find(
    (protectedPath) =>
      pathname === protectedPath ||
      (protectedPath !== "/" && pathname.startsWith(`${protectedPath}/`)),
  );

  return matchedPath ? normalizedReturnPath : "/";
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value) || typeof value.expiresAt !== "string") {
    return false;
  }

  if (Number.isNaN(Date.parse(value.expiresAt))) {
    return false;
  }

  const user = value.user;
  return (
    isRecord(user) &&
    typeof user.email === "string" &&
    typeof user.id === "string" &&
    typeof user.name === "string"
  );
}

function normalizeDecodedAuthSession(session: AuthSession): AuthSession {
  const normalizedUserId = normalizeLocalAuthUserId(
    session.user.id,
    session.user.email,
  );

  if (normalizedUserId === session.user.id) {
    return session;
  }

  return {
    ...session,
    user: {
      ...session.user,
      id: normalizedUserId,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSupabaseDisplayName(metadata: unknown, email: string) {
  if (isRecord(metadata)) {
    for (const key of ["display_name", "full_name", "name"]) {
      const value = metadata[key];

      if (typeof value === "string") {
        const normalizedName = normalizeLocalAuthName(value);

        if (normalizedName) {
          return normalizedName;
        }
      }
    }
  }

  return email.split("@")[0] || "Adventurer";
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);

  return toBase64UrlFromBytes(bytes);
}

function toBase64UrlFromBytes(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}
