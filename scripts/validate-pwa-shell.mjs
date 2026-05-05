import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/error.tsx",
  "apps/web/src/app/(protected)/loading.tsx",
  "apps/web/src/app/apple-icon.tsx",
  "apps/web/src/app/icon.tsx",
  "apps/web/src/app/manifest.ts",
  "apps/web/src/components/app-shell-navigation.tsx",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing PWA or shell file: ${file}`);
}

const layout = readText("apps/web/src/app/layout.tsx");
expect(
  layout.includes('manifest: "/manifest.webmanifest"'),
  "Root layout must link the generated web app manifest.",
);
expect(layout.includes("appleWebApp"), "Root layout must configure Apple web app metadata.");
expect(layout.includes("themeColor"), "Root layout must export a viewport theme color.");

const manifest = readText("apps/web/src/app/manifest.ts");
expect(manifest.includes("short_name"), "Manifest must define a short name.");
expect(manifest.includes('display: "standalone"'), "Manifest must use standalone display.");
expect(manifest.includes('start_url: "/"'), "Manifest must define the root start URL.");
expect(manifest.includes("theme_color"), "Manifest must define a theme color.");
expect(manifest.includes("icons"), "Manifest must include icon entries.");
expect(!manifest.includes('src: "/icon1"'), "Manifest must not reference unsupported icon routes.");

const middleware = readText("apps/web/src/middleware.ts");
expect(
  middleware.includes("manifest.webmanifest"),
  "Middleware matcher must exempt the manifest route.",
);
expect(
  middleware.includes("apple-icon"),
  "Middleware matcher must exempt the Apple icon route.",
);
expect(middleware.includes("icon"), "Middleware matcher must exempt the app icon route.");

const navigation = readText("apps/web/src/components/app-shell-navigation.tsx");
expect(navigation.includes("usePathname"), "Shell navigation must detect the current route.");
expect(
  navigation.includes("overflow-x-auto"),
  "Mobile shell navigation must stay scrollable on narrow screens.",
);
expect(
  navigation.includes('aria-current={isActive ? "page" : undefined}'),
  "Shell navigation must expose the active page for accessibility.",
);

const shell = readText("apps/web/src/components/protected-app-shell.tsx");
expect(shell.includes("AppShellNavigation"), "Protected shell must use the shared navigation.");
expect(shell.includes("lg:hidden"), "Protected shell must render a mobile navigation state.");

const protectedLoading = readText("apps/web/src/app/(protected)/loading.tsx");
expect(
  protectedLoading.includes("Campaign table"),
  "Protected loading should stay aligned with the shell experience.",
);

const protectedError = readText("apps/web/src/app/(protected)/error.tsx");
expect(
  protectedError.includes("Try again"),
  "Protected error state should provide a retry action.",
);

if (failures.length > 0) {
  console.error("PWA and shell validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("PWA and shell validation passed.");

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
