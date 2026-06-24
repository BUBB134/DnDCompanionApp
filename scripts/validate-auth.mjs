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
  "apps/web/src/app/api/auth/session/route.ts",
  "apps/web/src/app/forgot-password/page.tsx",
  "apps/web/src/app/sign-in/[[...sign-in]]/page.tsx",
  "apps/web/src/app/sign-up/[[...sign-up]]/page.tsx",
  "apps/web/src/app/update-password/page.tsx",
  "apps/web/src/auth/actions.ts",
  "apps/web/src/auth/appearance.ts",
  "apps/web/src/auth/config.ts",
  "apps/web/src/auth/identity.ts",
  "apps/web/src/auth/provider.tsx",
  "apps/web/src/auth/redirect.ts",
  "apps/web/src/auth/server.ts",
  "apps/web/src/auth/session.ts",
  "apps/web/src/auth/status-notice.tsx",
  "apps/web/src/components/auth-page-frame.tsx",
  "apps/web/src/components/clerk-account-controls.tsx",
  "apps/web/src/components/protected-app-shell.tsx",
  "apps/web/src/components/protected-scaffold-page.tsx",
  "apps/web/src/proxy.ts",
  "docs/engineering/managed-auth.md",
  "packages/db/migrations/0014_clerk_user_identity.sql",
  "packages/types/src/auth.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing auth file: ${file}`);
}

const proxy = readText("apps/web/src/proxy.ts");
for (const snippet of [
  "clerkMiddleware",
  "hasAuthSessionCookie",
  'pathname === "/sign-in"',
  'pathname === "/sign-up"',
  'searchParams.set("next"',
]) {
  expect(proxy.includes(snippet), `Auth proxy is missing expected behavior: ${snippet}`);
}

const protectedLayout = readText("apps/web/src/app/(protected)/layout.tsx");
expect(
  protectedLayout.includes("requireAuthSession"),
  "Protected layout must require an authenticated session.",
);
expect(
  protectedLayout.includes("ProtectedAppShell"),
  "Protected layout must render the protected app shell.",
);

const signInPage = readText("apps/web/src/app/sign-in/[[...sign-in]]/page.tsx");
for (const snippet of [
  "SignIn",
  "arcaneClerkAppearance",
  "forceRedirectUrl={nextPath}",
  "signUpUrl={signUpUrl}",
  "canCreateAuthSessionToken",
  "disabled={!canAuthenticate}",
  'role="alert"',
  'data-auth-provider="clerk"',
]) {
  expect(signInPage.includes(snippet), `Sign-in page is missing: ${snippet}`);
}

const signUpPage = readText("apps/web/src/app/sign-up/[[...sign-up]]/page.tsx");
for (const snippet of [
  "SignUp",
  "arcaneClerkAppearance",
  "forceRedirectUrl={nextPath}",
  "signInUrl={signInUrl}",
  'data-auth-provider="clerk"',
]) {
  expect(signUpPage.includes(snippet), `Sign-up page is missing: ${snippet}`);
}

const authFrame = readText("apps/web/src/components/auth-page-frame.tsx");
expect(
  authFrame.includes("The DnD Companion") &&
    authFrame.includes("First campaign path") &&
    authFrame.includes("Playfair_Display"),
  "Auth pages must use the branded Stitch-inspired frame.",
);

const campaignAccessState = readText(
  "apps/web/src/components/campaign-access-state.tsx",
);
expect(
  campaignAccessState.includes('href="/campaigns"') &&
    campaignAccessState.includes("Create or open a campaign"),
  "Users without campaign access should receive an actionable campaign onboarding path.",
);

const actions = readText("apps/web/src/auth/actions.ts");
for (const snippet of [
  "canCreateAuthSessionToken",
  "getSafeReturnPath",
  "setAuthSessionCookie",
  "clearAuthSessionCookie",
]) {
  expect(actions.includes(snippet), `Local auth action is missing: ${snippet}`);
}
expect(
  !actions.includes("supabase.auth"),
  "Auth actions must not retain Supabase Auth calls after the Clerk migration.",
);

const authSession = readText("apps/web/src/auth/session.ts");
for (const snippet of [
  "AUTH_SESSION_SECRET_MIN_LENGTH = 32",
  "trim().length >= AUTH_SESSION_SECRET_MIN_LENGTH",
  "createManagedAuthSession",
  '"/invite"',
]) {
  expect(authSession.includes(snippet), `Auth session module is missing: ${snippet}`);
}

const provider = readText("apps/web/src/auth/provider.tsx");
expect(provider.includes('"loading"'), "Auth provider must expose a loading state.");
expect(provider.includes('"error"'), "Auth provider must expose an error state.");
expect(provider.includes("/api/auth/session"), "Auth provider must resolve session state.");

const shell = readText("apps/web/src/components/protected-app-shell.tsx");
expect(shell.includes("ClerkAccountControls"), "Protected shell must expose Clerk account controls.");
expect(shell.includes("signOutAction"), "Protected shell must retain local sign-out.");
expect(shell.includes("lg:hidden"), "Protected shell must include mobile navigation.");
expect(shell.includes("AuthStatusNotice"), "Protected shell must render auth resolution status.");

const authServer = readText("apps/web/src/auth/server.ts");
for (const snippet of [
  "currentUser",
  "resolveClerkAuthUser",
  "createManagedAuthSession",
]) {
  expect(authServer.includes(snippet), `Server auth is missing: ${snippet}`);
}

const identity = readText("apps/web/src/auth/identity.ts");
for (const snippet of [
  "clerk_user_id",
  "on conflict (email) do update",
  "This email is already linked to a different Clerk account.",
]) {
  expect(identity.includes(snippet), `Clerk identity bridge is missing: ${snippet}`);
}

const migration = readText("packages/db/migrations/0014_clerk_user_identity.sql");
for (const snippet of [
  "add column if not exists clerk_user_id",
  "users_clerk_user_id_unique_idx",
]) {
  expect(migration.includes(snippet), `Clerk identity migration is missing: ${snippet}`);
}

const envPackage = readText("packages/env/src/index.ts");
for (const snippet of [
  '"local", "clerk"',
  "AUTH_PROVIDER must be clerk in preview and production.",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "https://thedndcompanion.com",
]) {
  expect(envPackage.includes(snippet), `Environment contract is missing: ${snippet}`);
}

const managedAuthDocs = readText("docs/engineering/managed-auth.md");
for (const snippet of [
  "Clerk",
  "AUTH_PROVIDER=clerk",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "clerk_user_id",
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
  const managedSession = sessionModule.createManagedAuthSession(
    {
      email: "player@example.com",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Mira",
    },
    2_000_000_000,
  );

  expect(
    managedSession?.user.id === "11111111-1111-4111-8111-111111111111" &&
      managedSession.user.email === "player@example.com" &&
      managedSession.user.name === "Mira" &&
      managedSession.expiresAt === "2033-05-18T03:33:20.000Z",
    "Managed claims must map to the shared AuthSession contract.",
  );
  expect(
    sessionModule.createManagedAuthSession(
      {
        email: "player@example.com",
        id: "11111111-1111-4111-8111-111111111111",
        name: "Mira",
      },
      "not-a-number",
    ) === null,
    "Managed sessions without a numeric expiry must be rejected.",
  );
  expect(
    sessionModule.getSafeReturnPath("/invite/example?source=email") ===
      "/invite/example?source=email" &&
      sessionModule.getSafeReturnPath("/update-password") === "/" &&
      sessionModule.getSafeReturnPath("https://example.com") === "/",
    "Auth return paths must preserve invite routes without allowing external redirects.",
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
