import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const globalsCss = readText("apps/web/src/app/globals.css");
const failures = [];

for (const snippet of [
  "@layer base {\n  a {\n    color: inherit;",
  "-webkit-appearance: none",
  "appearance: none",
  "-webkit-tap-highlight-color: transparent",
  "button:where(:not(:disabled)):active",
  "button:focus-visible",
]) {
  expect(
    globalsCss.includes(snippet),
    `Global interactive states are missing required protection: ${snippet}`,
  );
}

expect(
  globalsCss.indexOf("@layer base {") < globalsCss.indexOf("a {"),
  "Global anchor color inheritance must stay inside the base layer so utility foreground colors can win.",
);

const appShellNavigation = readText(
  "apps/web/src/components/app-shell-navigation.tsx",
);
expect(
  appShellNavigation.includes(
    '"border-[#17161f] bg-[#17161f] text-white shadow-sm"',
  ),
  "Active app-shell navigation links must pair the ink background with white text.",
);

const rulesPage = readText("apps/web/src/app/(protected)/rules/page.tsx");
expect(
  rulesPage.includes(
    '? "border-[#17161f] bg-[#17161f] text-white"',
  ),
  "Active rules filters must pair the ink background with white text.",
);

const darkBackgroundClasses = [
  "bg-black",
  "bg-[#17161f]",
  "bg-[#2d2937]",
  "bg-[#6f2430]",
  "bg-[#8b2f39]",
];
const lightForegroundClasses = [
  "text-white",
  "text-[#f2ca50]",
  "text-[#ffe6a8]",
];

for (const file of collectFiles(join(rootDir, "apps/web/src"), ".tsx")) {
  const source = readFileSync(file, "utf8");
  const interactiveTags =
    source.match(/<(?:button|a|Link)\b[\s\S]*?>/gu) ?? [];

  for (const interactiveTag of interactiveTags) {
    const classNames = [
      ...interactiveTag.matchAll(/"([^"]+)"/gu),
    ].flatMap((match) => match[1].split(/\s+/u));
    const usesDarkBackground = classNames.some((className) =>
      darkBackgroundClasses.some(
        (background) =>
          className === background ||
          className.endsWith(`:${background}`) ||
          className.startsWith(`${background}/`),
      ),
    );

    if (!usesDarkBackground) {
      continue;
    }

    const hasLightForeground = classNames.some((className) =>
      lightForegroundClasses.some(
        (foreground) =>
          className === foreground ||
          className.endsWith(`:${foreground}`) ||
          className.startsWith(`${foreground}/`),
      ),
    );

    expect(
      hasLightForeground,
      `${relativePath(file)} has a dark interactive background without an explicit light foreground: ${compact(interactiveTag)}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Interactive contrast validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Interactive contrast validation passed.");

function collectFiles(directory, extension) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? collectFiles(path, extension)
      : path.endsWith(extension)
        ? [path]
        : [];
  });
}

function compact(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function readText(path) {
  return readFileSync(join(rootDir, path), "utf8");
}

function relativePath(path) {
  return path.slice(rootDir.length + 1).replaceAll("\\", "/");
}
