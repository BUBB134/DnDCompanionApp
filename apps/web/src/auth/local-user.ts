export const DEFAULT_LOCAL_AUTH_EMAIL = "dm@local.test";
export const DEFAULT_LOCAL_AUTH_NAME = "Local DM";
export const LEGACY_LOCAL_DM_USER_ID = "local-dm";

export function createLocalUserId(email: string) {
  return `local:${normalizeLocalAuthEmail(email) ?? DEFAULT_LOCAL_AUTH_EMAIL}`;
}

export function normalizeLocalAuthUserId(
  userId: string,
  email: string | undefined,
) {
  const normalizedEmail = normalizeLocalAuthEmail(email);

  if (!normalizedEmail) {
    return userId;
  }

  if (userId === LEGACY_LOCAL_DM_USER_ID || userId.startsWith("local:")) {
    return createLocalUserId(normalizedEmail);
  }

  return userId;
}

export function normalizeLocalAuthEmail(email: string | undefined) {
  const trimmed = email?.trim().toLowerCase();

  if (!trimmed || !trimmed.includes("@") || trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

export function normalizeLocalAuthName(name: string | undefined) {
  const trimmed = name?.trim();

  if (!trimmed || trimmed.length > 80) {
    return null;
  }

  return trimmed;
}
