import {
  isNonLocalAppEnvironment,
  readPublicEnv,
  readServerEnv,
  type EnvSource,
} from "@dnd/env";

export function getAuthProvider(source: EnvSource = process.env) {
  return readServerEnv(source).AUTH_PROVIDER;
}

export function getSupabaseAuthConfig(source: EnvSource = process.env) {
  const env = readPublicEnv(source);

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return {
    publishableKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url: env.NEXT_PUBLIC_SUPABASE_URL,
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

export function isSupabaseAuthConfigured(source: EnvSource = process.env) {
  return Boolean(getSupabaseAuthConfig(source) && getAuthAppBaseUrl(source));
}
