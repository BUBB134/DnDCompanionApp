import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
  "apps/web/src/app/sign-in/page.tsx",
  "apps/web/src/auth/actions.ts",
  "apps/web/src/auth/provider.tsx",
  "apps/web/src/auth/redirect.ts",
  "apps/web/src/auth/server.ts",
  "apps/web/src/auth/session.ts",
  "apps/web/src/auth/status-notice.tsx",
  "apps/web/src/components/protected-app-shell.tsx",
  "apps/web/src/components/protected-scaffold-page.tsx",
  "apps/web/src/middleware.ts",
  "packages/types/src/auth.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing auth file: ${file}`);
}

const middleware = readText("apps/web/src/middleware.ts");
expect(
  middleware.includes("hasAuthSessionCookie"),
  "Middleware must inspect the auth session cookie.",
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
  signInPage.includes('name="next"'),
  "Sign-in page must submit the safe return path.",
);

const actions = readText("apps/web/src/auth/actions.ts");
expect(actions.includes("getSafeReturnPath"), "Sign-in must honor the safe return path.");
expect(actions.includes("setAuthSessionCookie"), "Sign-in must set a session cookie.");
expect(actions.includes("clearAuthSessionCookie"), "Sign-out must clear the session cookie.");

const provider = readText("apps/web/src/auth/provider.tsx");
expect(provider.includes('"loading"'), "Auth provider must expose a loading state.");
expect(provider.includes('"error"'), "Auth provider must expose an error state.");
expect(provider.includes("/api/auth/session"), "Auth provider must resolve session state.");

const shell = readText("apps/web/src/components/protected-app-shell.tsx");
expect(shell.includes("signOutAction"), "Protected shell must expose sign-out.");
expect(shell.includes("lg:hidden"), "Protected shell must include mobile navigation.");
expect(shell.includes("AuthStatusNotice"), "Protected shell must render auth resolution status.");

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
