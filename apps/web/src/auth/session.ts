import type { AuthSession } from "@dnd/types";

export const AUTH_COOKIE_NAME = "dnd_local_session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const PROTECTED_RETURN_PATHS = ["/"] as const;
const SESSION_TOKEN_PREFIX = "local-v1.";
const DEFAULT_USER = {
  email: "dm@local.test",
  id: "local-dm",
  name: "Local DM",
};

type LocalSessionInput = {
  email?: string;
  name?: string;
};

export type ProtectedReturnPath = (typeof PROTECTED_RETURN_PATHS)[number];

export function createLocalAuthSession(
  input: LocalSessionInput = {},
  now = new Date(),
): AuthSession {
  return {
    expiresAt: new Date(now.getTime() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000).toISOString(),
    user: {
      email: normalizeEmail(input.email) ?? DEFAULT_USER.email,
      id: DEFAULT_USER.id,
      name: normalizeName(input.name) ?? DEFAULT_USER.name,
    },
  };
}

export function encodeAuthSession(session: AuthSession) {
  return `${SESSION_TOKEN_PREFIX}${toBase64Url(JSON.stringify(session))}`;
}

export function decodeAuthSession(
  cookieValue: string | null | undefined,
  now = new Date(),
): AuthSession | null {
  if (!cookieValue?.startsWith(SESSION_TOKEN_PREFIX)) {
    return null;
  }

  try {
    const decoded = fromBase64Url(cookieValue.slice(SESSION_TOKEN_PREFIX.length));
    const session = JSON.parse(decoded) as unknown;

    if (!isAuthSession(session)) {
      return null;
    }

    if (Date.parse(session.expiresAt) <= now.getTime()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function hasAuthSessionCookie(cookieValue: string | null | undefined) {
  return decodeAuthSession(cookieValue) !== null;
}

export function getSafeReturnPath(
  returnPath: string | null | undefined,
): ProtectedReturnPath {
  if (!returnPath || !returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/";
  }

  if (returnPath === "/sign-in" || returnPath.startsWith("/sign-in?")) {
    return "/";
  }

  const pathname = returnPath.split(/[?#]/)[0] ?? "/";
  const matchedPath = PROTECTED_RETURN_PATHS.find(
    (protectedPath) =>
      pathname === protectedPath ||
      (protectedPath !== "/" && pathname.startsWith(`${protectedPath}/`)),
  );

  return matchedPath ?? "/";
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

function normalizeEmail(email: string | undefined) {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@") || trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

function normalizeName(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.length > 80) {
    return null;
  }

  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
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
