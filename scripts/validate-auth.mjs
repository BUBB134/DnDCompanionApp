import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import typescript from "typescript";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/campaigns/page.tsx",
  "apps/web/src/app/(protected)/entities/page.tsx",
  "apps/web/src/app/(protected)/layout.tsx",
  "apps/web/src/app/(protected)/page.tsx",
  "apps/web/src/app/(protected)/rules/page.tsx",
  "apps/web/src/app/(protected)/sessions/page.tsx",
  "apps/web/src/app/auth/callback/route.ts",
  "apps/web/src/app/api/auth/session/route.ts",
  "apps/web/src/app/forgot-password/page.tsx",
  "apps/web/src/app/sign-in/page.tsx",
  "apps/web/src/app/update-password/page.tsx",
  "apps/web/src/auth/actions.ts",
  "apps/web/src/auth/config.ts",
  "apps/web/src/auth/provider.tsx",
  "apps/web/src/auth/redirect.ts",
  "apps/web/src/auth/server.ts",
  "apps/web/src/auth/session.ts",
  "apps/web/src/auth/status-notice.tsx",
  "apps/web/src/auth/supabase/middleware.ts",
  "apps/web/src/auth/supabase/server.ts",
  "apps/web/src/components/protected-app-shell.tsx",
  "apps/web/src/components/protected-scaffold-page.tsx",
  "apps/web/src/middleware.ts",
  "docs/engineering/managed-auth.md",
  "packages/types/src/auth.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing auth file: ${file}`);
}

const middleware = readText("apps/web/src/middleware.ts");
expect(
  middleware.includes("hasAuthSessionCookie"),
  "Middleware must retain local auth session support.",
);
expect(
  middleware.includes("resolveSupabaseMiddlewareAuth"),
  "Middleware must refresh and verify managed Supabase sessions.",
);
expect(
  middleware.includes('pathname = "/sign-in"') ||
    middleware.includes('pathname === "/sign-in"'),
  "Middleware must redirect unauthenticated users to sign-in.",
);
expect(
  middleware.includes('searchParams.set("next"'),
  "Middleware must preserve the requested path in a next parameter.",
);

const protectedLayout = readText("apps/web/src/app/(protected)/layout.tsx");
expect(
  protectedLayout.includes("requireAuthSession"),
  "Protected layout must require an authenticated session.",
);
expect(
  protectedLayout.includes("ProtectedAppShell"),
  "Protected layout must render the protected app shell.",
);

const signInPage = readText("apps/web/src/app/sign-in/page.tsx");
expect(signInPage.includes("signInAction"), "Sign-in page must wire the sign-in action.");
expect(
  signInPage.includes("canCreateAuthSessionToken"),
  "Sign-in page must retain the local contributor auth guard.",
);
expect(
  signInPage.includes("signUpAction"),
  "Sign-in page must expose real account creation.",
);
expect(
  signInPage.includes("/forgot-password"),
  "Sign-in page must expose account recovery.",
);
expect(
  signInPage.includes('role="alert"'),
  "Sign-in page must expose configuration failures as an accessible alert.",
);
expect(
  signInPage.includes("disabled={!canAuthenticate}"),
  "Sign-in page must only disable inputs based on runtime session capability.",
);
expect(
  signInPage.includes('name="next"'),
  "Sign-in page must submit the safe return path.",
);

const actions = readText("apps/web/src/auth/actions.ts");
expect(
  actions.includes("canCreateAuthSessionToken"),
  "Sign-in action must retain local contributor auth.",
);
expect(actions.includes("getSafeReturnPath"), "Sign-in must honor the safe return path.");
expect(actions.includes("setAuthSessionCookie"), "Sign-in must set a session cookie.");
expect(actions.includes("clearAuthSessionCookie"), "Sign-out must clear the session cookie.");
for (const snippet of [
  "signInWithPassword",
  "supabase.auth.signUp",
  "resetPasswordForEmail",
  "updateUser",
  "supabase.auth.signOut",
]) {
  expect(actions.includes(snippet), `Managed auth actions are missing: ${snippet}`);
}

const authSession = readText("apps/web/src/auth/session.ts");
expect(
  authSession.includes("AUTH_SESSION_SECRET_MIN_LENGTH = 32"),
  "Auth sessions must use the production minimum secret length.",
);
expect(
  authSession.includes("trim().length >= AUTH_SESSION_SECRET_MIN_LENGTH"),
  "Auth session token creation must reject short secrets.",
);

const provider = readText("apps/web/src/auth/provider.tsx");
expect(provider.includes('"loading"'), "Auth provider must expose a loading state.");
expect(provider.includes('"error"'), "Auth provider must expose an error state.");
expect(provider.includes("/api/auth/session"), "Auth provider must resolve session state.");

const shell = readText("apps/web/src/components/protected-app-shell.tsx");
expect(shell.includes("signOutAction"), "Protected shell must expose sign-out.");
expect(shell.includes("lg:hidden"), "Protected shell must include mobile navigation.");
expect(shell.includes("AuthStatusNotice"), "Protected shell must render auth resolution status.");

const authServer = readText("apps/web/src/auth/server.ts");
expect(
  authServer.includes("supabase.auth.getClaims()"),
  "Server auth must establish managed identity from verified JWT claims.",
);

const callbackRoute = readText("apps/web/src/app/auth/callback/route.ts");
expect(
  callbackRoute.includes("exchangeCodeForSession"),
  "Auth callback must exchange the Supabase PKCE code.",
);
expect(
  callbackRoute.includes("getSafeReturnPath"),
  "Auth callback must validate its return path.",
);

const envPackage = readText("packages/env/src/index.ts");
expect(
  envPackage.includes('"local", "supabase"'),
  "Environment contract must support local and Supabase auth providers.",
);
expect(
  envPackage.includes("AUTH_PROVIDER must be supabase in preview and production."),
  "Preview and production must reject the local auth provider.",
);

const managedAuthDocs = readText("docs/engineering/managed-auth.md");
for (const snippet of [
  "Supabase Auth",
  "/auth/callback",
  "AUTH_PROVIDER=supabase",
  "Migration from local auth",
]) {
  expect(
    managedAuthDocs.includes(snippet),
    `Managed auth documentation is missing: ${snippet}`,
  );
}

await validateSessionBehavior();

if (failures.length > 0) {
  console.error("Auth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Auth validation passed.");

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function readText(path) {
  return readFileSync(resolve(path), "utf8");
}

function resolve(path) {
  return join(rootDir, path);
}

async function validateSessionBehavior() {
  const localUserUrl = await transpileModuleToDataUrl(
    "apps/web/src/auth/local-user.ts",
  );
  const envStubUrl = moduleDataUrl(`
    export function isNonLocalAppEnvironment(value) {
      return value === "preview" || value === "production";
    }
    export function readPublicEnv(source) {
      return { NEXT_PUBLIC_APP_ENV: source.NEXT_PUBLIC_APP_ENV ?? "local" };
    }
    export function readServerEnv(source) {
      return { AUTH_SESSION_SECRET: source.AUTH_SESSION_SECRET };
    }
  `);
  const sessionUrl = await transpileModuleToDataUrl(
    "apps/web/src/auth/session.ts",
    [
      ['"@dnd/env"', `"${envStubUrl}"`],
      ['"@/auth/local-user"', `"${localUserUrl}"`],
    ],
  );
  const sessionModule = await import(sessionUrl);
  const managedSession = sessionModule.createSupabaseAuthSession({
    email: "Player@Example.com",
    exp: 2_000_000_000,
    sub: "11111111-1111-4111-8111-111111111111",
    user_metadata: {
      display_name: "Mira",
    },
  });

  expect(
    managedSession?.user.id === "11111111-1111-4111-8111-111111111111" &&
      managedSession.user.email === "player@example.com" &&
      managedSession.user.name === "Mira" &&
      managedSession.expiresAt === "2033-05-18T03:33:20.000Z",
    "Supabase claims must map to the shared AuthSession contract.",
  );
  expect(
    sessionModule.createSupabaseAuthSession({
      exp: 2_000_000_000,
      sub: "11111111-1111-4111-8111-111111111111",
    }) === null,
    "Managed sessions without an email must be rejected.",
  );
  expect(
    sessionModule.getSafeReturnPath("/invite/example?source=email") ===
      "/invite/example?source=email" &&
      sessionModule.getSafeReturnPath("/update-password") ===
        "/update-password" &&
      sessionModule.getSafeReturnPath("https://example.com") === "/",
    "Auth return paths must preserve invite and recovery routes without allowing external redirects.",
  );
}

async function transpileModuleToDataUrl(path, replacements = []) {
  let source = readText(path);

  for (const [from, to] of replacements) {
    source = source.replaceAll(from, to);
  }

  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;

  return moduleDataUrl(compiled);
}

function moduleDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}
