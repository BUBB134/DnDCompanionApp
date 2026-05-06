import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/rules/page.tsx",
  "apps/web/src/components/rule-card.tsx",
  "apps/web/src/components/rule-linked-text.tsx",
  "apps/web/src/components/session-note-document-view.tsx",
  "apps/web/src/rules/core-rules.ts",
  "apps/web/src/rules/matching.ts",
  "apps/web/src/rules/repository.ts",
  "apps/web/src/rules/routing.ts",
  "packages/db/migrations/0003_core_rule_snippets.sql",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing rules workflow file: ${file}`);
}

const migrationText = readText("packages/db/migrations/0003_core_rule_snippets.sql");
for (const expectedText of [
  "insert into rule_snippets",
  "aliases text[]",
  "'prone'",
  "'grappled'",
  "'stunned'",
  "'concentration'",
  "on conflict (slug) do update",
]) {
  expect(
    migrationText.includes(expectedText),
    `Rules migration must seed and maintain core rules: ${expectedText}`,
  );
}

const campaignTypesText = readText("packages/types/src/campaign.ts");
for (const expectedText of ["slug: string", "body: string", "aliases: string[]"]) {
  expect(
    campaignTypesText.includes(expectedText),
    `RuleSnippet shared type must include ${expectedText}.`,
  );
}

const rulesPageText = readText("apps/web/src/app/(protected)/rules/page.tsx");
for (const expectedText of [
  "listRuleSnippetsForUser",
  "filterRulesBySearch",
  "createCategoryFilterHref(filter.value, query)",
  'params.set("q", query)',
  "RuleCard",
  'name="q"',
  "No rules found",
]) {
  expect(
    rulesPageText.includes(expectedText),
    `Rules page must include ${expectedText}.`,
  );
}

expect(
  readText("apps/web/src/app/(protected)/sessions/page.tsx").includes(
    "SessionNoteDocumentView",
  ) &&
    readText("apps/web/src/components/session-note-document-view.tsx").includes(
      "RuleLinkedText",
    ),
  "Session notes must render rule-linked inline text through the note document view.",
);

expect(
  readText("apps/web/src/components/campaign-shell.tsx").includes("RuleCard"),
  "Campaign shell must render surfaced rules as cards.",
);

const repositoryText = readText("apps/web/src/rules/repository.ts");
for (const expectedSql of [
  "from rule_snippets",
  "campaign_memberships",
  "rule_snippets.visibility = 'player-safe'",
  "unnest(rule_snippets.aliases)",
  "rule_snippets.body ilike",
]) {
  expect(
    repositoryText.includes(expectedSql),
    `Rules repository must enforce retrieval/access SQL: ${expectedSql}`,
  );
}

const typescriptPath = resolveTypeScriptRuntimePath();
const hasTypeScriptRuntime = typescriptPath !== null;
const typescriptRuntime = hasTypeScriptRuntime
  ? await import(pathToFileURL(typescriptPath).href)
  : null;
const typescript = hasTypeScriptRuntime
  ? (typescriptRuntime.default ?? typescriptRuntime)
  : null;

if (hasTypeScriptRuntime) {
  const campaignTypesUrl = await transpileModuleToDataUrl(
    "packages/types/src/campaign.ts",
  );
  const coreRulesUrl = await transpileModuleToDataUrl(
    "apps/web/src/rules/core-rules.ts",
    [["@dnd/types", campaignTypesUrl]],
  );
  const matchingModule = await import(
    await transpileModuleToDataUrl("apps/web/src/rules/matching.ts", [
      ["@dnd/types", campaignTypesUrl],
    ]),
  );
  const coreRulesModule = await import(coreRulesUrl);

  const referencedRules = matchingModule.findReferencedRules(
    "The ogre knocked Mira prone and almost broke concentration.",
    coreRulesModule.coreRuleSnippets,
  );
  expect(
    referencedRules.map((rule) => rule.slug).join(",") ===
      "prone,concentration",
    "Rule matching must surface referenced condition and mechanic cards in text order.",
  );

  const splitParts = matchingModule.splitRuleLinkedText(
    "Pinned while grappled.",
    coreRulesModule.coreRuleSnippets,
  );
  expect(
    splitParts.some((part) => part.rule?.slug === "grappled"),
    "Rule linked text must identify tappable inline rule mentions.",
  );

  const conditionResults = matchingModule.filterRulesBySearch(
    coreRulesModule.coreRuleSnippets,
    "stun",
    "condition",
  );
  expect(
    conditionResults.length === 1 && conditionResults[0].slug === "stunned",
    "Rule search must filter by category and aliases.",
  );

  const dbStubModuleUrl = moduleDataUrl(`
    export const queries = [];

    export async function queryDatabase(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [
          {
            aliases: ["prone", "knocked down"],
            body: "A prone creature spends extra movement to stand.",
            category: "condition",
            id: "rule-1",
            slug: "prone",
            summary: "Use when a creature is knocked down.",
            title: "Prone",
            visibility: "player-safe",
          },
        ],
      };
    }
  `);
  const dbStubModule = await import(dbStubModuleUrl);
  const repositoryModule = await import(
    await transpileModuleToDataUrl("apps/web/src/rules/repository.ts", [
      ["@dnd/db", dbStubModuleUrl],
      ["@dnd/types", campaignTypesUrl],
    ]),
  );

  const listedRules = await repositoryModule.listRuleSnippetsForUser(
    "user-1",
    "campaign-1",
    "prone",
    "condition",
  );
  expect(
    listedRules[0]?.slug === "prone" &&
      listedRules[0]?.aliases.includes("knocked down"),
    "Rules repository must map persisted snippets and aliases.",
  );
  expect(
    dbStubModule.queries[0]?.values[2] === "condition" &&
      dbStubModule.queries[0]?.values[3] === "prone",
    "Rules repository must pass category and search query parameters.",
  );
}

if (failures.length > 0) {
  console.error("Rules validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Rules validation passed.");

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

async function transpileModuleToDataUrl(path, replacements = []) {
  if (!typescript) {
    throw new Error("TypeScript runtime is not available for validation.");
  }

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

function resolveTypeScriptRuntimePath() {
  const localPath = resolve("node_modules/typescript/lib/typescript.js");

  if (existsSync(localPath)) {
    return localPath;
  }

  const vscodeBasePath = join(
    process.env.LOCALAPPDATA ?? "",
    "Programs",
    "Microsoft VS Code",
  );

  if (!existsSync(vscodeBasePath)) {
    return null;
  }

  for (const entry of readdirSync(vscodeBasePath, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidatePath = join(
      vscodeBasePath,
      entry.name,
      "resources",
      "app",
      "extensions",
      "node_modules",
      "typescript",
      "lib",
      "typescript.js",
    );

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}
