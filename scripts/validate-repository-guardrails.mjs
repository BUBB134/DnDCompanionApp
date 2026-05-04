import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".github/workflows/branch-name.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/commit-check.yml",
  ".github/workflows/pr-title.yml",
  "docs/engineering/branch_protection.md",
  "docs/engineering/pull_request_template.md",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing required repository guardrail file: ${file}`);
}

const ciWorkflow = readText(".github/workflows/ci.yml");
for (const snippet of [
  "pull_request:",
  "push:",
  "merge_group:",
  "- main",
  "run: npm install",
  "run: npm run lint",
  "run: npm run typecheck",
  "run: npm test",
  "run: npm run build",
]) {
  expect(
    ciWorkflow.includes(snippet),
    `CI workflow is missing expected configuration: ${snippet}`,
  );
}

const codeowners = readText(".github/CODEOWNERS");
for (const snippet of [
  "* @BUBB134",
  "/.github/ @BUBB134",
  "/apps/web/ @BUBB134",
  "/packages/db/ @BUBB134",
  "/packages/env/ @BUBB134",
  "/packages/types/ @BUBB134",
  "/packages/ui/ @BUBB134",
]) {
  expect(
    codeowners.includes(snippet),
    `CODEOWNERS is missing expected ownership entry: ${snippet}`,
  );
}

const commitCheckWorkflow = readText(".github/workflows/commit-check.yml");
for (const snippet of [
  "fetch-depth: 0",
  'git fetch origin "${{ github.base_ref }}" --depth=1',
  'git log --no-merges --format=%s "$MERGE_BASE..HEAD"',
  "No non-merge pull request commits found to validate.",
]) {
  expect(
    commitCheckWorkflow.includes(snippet),
    `Commit check workflow is missing expected configuration: ${snippet}`,
  );
}

for (const path of [
  ".github/pull_request_template.md",
  "docs/engineering/pull_request_template.md",
]) {
  const template = readText(path);
  for (const section of [
    "## Summary",
    "## Linked issue",
    "## Scope",
    "## Testing",
    "## Risks / notes",
    "## Follow-ups",
  ]) {
    expect(template.includes(section), `${path} is missing required section: ${section}`);
  }

  for (const snippet of [
    "Closes DND-",
    "`npm run lint`",
    "`npm run typecheck`",
    "`npm test`",
    "`npm run build`",
  ]) {
    expect(template.includes(snippet), `${path} is missing expected content: ${snippet}`);
  }
}

const branchProtection = readText("docs/engineering/branch_protection.md");
for (const snippet of [
  "Require a pull request before merging",
  "Require 1 approving review",
  "Require review from Code Owners",
  "Do not allow direct pushes to `main`",
  "`ci`",
  "`branch-name`",
  "`commit-message`",
  "`pr-title`",
]) {
  expect(
    branchProtection.includes(snippet),
    `Branch protection guidance is missing expected content: ${snippet}`,
  );
}

const readme = readText("README.md");
for (const snippet of [
  "## Pull Request Flow",
  ".github/pull_request_template.md",
  "docs/engineering/branch_protection.md",
  "`ci`",
  "`branch-name`",
  "`commit-message`",
  "`pr-title`",
]) {
  expect(readme.includes(snippet), `README is missing expected contribution guidance: ${snippet}`);
}

const workingAgreement = readText("docs/engineering/working-agreement.md");
for (const snippet of [
  "Branches must follow `dnd-<ticket-number>-description`",
  "Commit subjects and PR titles must start with `[DND-123]`",
  "Use `.github/pull_request_template.md` and link the Linear issue in every PR",
  "Merge to `main` requires passing `ci`, `branch-name`, `commit-message`, and `pr-title`",
  "Merge to `main` requires one approving CODEOWNER review and resolved review conversations",
]) {
  expect(
    workingAgreement.includes(snippet),
    `Working agreement is missing expected merge guidance: ${snippet}`,
  );
}

if (failures.length > 0) {
  console.error("Repository guardrail validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Repository guardrail validation passed.");

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
