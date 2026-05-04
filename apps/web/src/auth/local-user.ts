export const DEFAULT_LOCAL_AUTH_EMAIL = "dm@local.test";
export const DEFAULT_LOCAL_AUTH_NAME = "Local DM";

export function createLocalUserId(email: string) {
  return `local:${normalizeLocalAuthEmail(email) ?? DEFAULT_LOCAL_AUTH_EMAIL}`;
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
