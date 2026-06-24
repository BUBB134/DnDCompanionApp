import {
  isNonLocalAppEnvironment,
  readPublicEnv,
  readServerEnv,
  type EnvSource,
} from "@dnd/env";

export function getAuthProvider(source: EnvSource = process.env) {
  return readServerEnv(source).AUTH_PROVIDER;
}

export function getClerkAuthConfig(source: EnvSource = process.env) {
  const publicEnv = readPublicEnv(source);
  const serverEnv = readServerEnv(source);

  if (
    !publicEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !serverEnv.CLERK_SECRET_KEY
  ) {
    return null;
  }

  return {
    publishableKey: publicEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: serverEnv.CLERK_SECRET_KEY,
  };
}

export function getAuthAppBaseUrl(source: EnvSource = process.env) {
  const serverEnv = readServerEnv(source);

  if (serverEnv.APP_BASE_URL) {
    return serverEnv.APP_BASE_URL.replace(/\/$/u, "");
  }

  const publicEnv = readPublicEnv(source);

  return isNonLocalAppEnvironment(publicEnv.NEXT_PUBLIC_APP_ENV)
    ? null
    : "http://localhost:3000";
}

export function isClerkAuthConfigured(source: EnvSource = process.env) {
  return Boolean(getClerkAuthConfig(source) && getAuthAppBaseUrl(source));
}
