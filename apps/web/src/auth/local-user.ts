export const DEFAULT_LOCAL_AUTH_EMAIL = "dm@local.test";
export const DEFAULT_LOCAL_AUTH_NAME = "Local DM";
export const LEGACY_LOCAL_DM_USER_ID = "local-dm";
const LOCAL_AUTH_USER_ID_NAMESPACE = "dnd-companion-local-user";
const LOCAL_AUTH_USER_ID_HASH_SEEDS = [
  0x811c9dc5,
  0x9e3779b9,
  0x85ebca6b,
  0xc2b2ae35,
] as const;

export function createLocalUserId(email: string) {
  const normalizedEmail = normalizeLocalAuthEmail(email) ?? DEFAULT_LOCAL_AUTH_EMAIL;

  return createDeterministicUuid(`${LOCAL_AUTH_USER_ID_NAMESPACE}:${normalizedEmail}`);
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

function createDeterministicUuid(value: string) {
  const bytes = new Uint8Array(16);

  LOCAL_AUTH_USER_ID_HASH_SEEDS.forEach((seed, index) => {
    const hash = hashString(value, seed);
    const offset = index * 4;

    bytes[offset] = (hash >>> 24) & 0xff;
    bytes[offset + 1] = (hash >>> 16) & 0xff;
    bytes[offset + 2] = (hash >>> 8) & 0xff;
    bytes[offset + 3] = hash & 0xff;
  });

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function hashString(value: string, seed: number) {
  let hash = seed;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
