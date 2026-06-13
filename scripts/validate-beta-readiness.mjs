import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = "docs/engineering/first-campaign-beta-readiness.json";
const runbookPath = "docs/engineering/first-campaign-beta-readiness.md";
const requireGo = process.argv.includes("--require-go");
const failures = [];

const requiredChecks = new Map([
  ["dm-managed-auth", ["scripts/validate-auth.mjs", "docs/engineering/managed-auth.md"]],
  [
    "player-managed-auth",
    ["scripts/validate-auth.mjs", "docs/engineering/managed-auth.md"],
  ],
  [
    "campaign-create",
    [
      "scripts/validate-campaign-creation.mjs",
      "scripts/validate-campaign-onboarding.mjs",
    ],
  ],
  [
    "campaign-invite",
    ["scripts/validate-campaign-invites.mjs", "docs/engineering/campaign-invites.md"],
  ],
  [
    "player-join",
    ["scripts/validate-campaign-access.mjs", "scripts/validate-campaign-invites.mjs"],
  ],
  [
    "session-create-open",
    ["scripts/validate-sessions.mjs", "docs/engineering/session-note-editor.md"],
  ],
  [
    "notes-save-reload",
    ["scripts/validate-sessions.mjs", "docs/engineering/session-note-editor.md"],
  ],
  [
    "character-companion",
    ["apps/web/src/characters/repository.ts"],
  ],
  [
    "mobile-main-flows",
    [
      "scripts/validate-pwa-shell.mjs",
      "apps/web/src/components/protected-app-shell.tsx",
    ],
  ],
  [
    "production-deployment",
    [
      "scripts/check-deployment.mjs",
      ".github/workflows/deployment-smoke.yml",
      "docs/engineering/production-integrations.md",
    ],
  ],
  ["known-limitations", [runbookPath]],
  ["go-no-go-recorded", [reportPath, runbookPath]],
]);

for (const path of [reportPath, runbookPath]) {
  expect(existsSync(resolve(path)), `Missing beta-readiness artifact: ${path}`);
}

let report;

try {
  report = JSON.parse(readText(reportPath));
} catch (error) {
  failures.push(
    `Beta-readiness report must contain valid JSON: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

if (report) {
  validateReport(report);
}

const runbook = readText(runbookPath);
for (const section of [
  "## Decision Rules",
  "## Automated Preflight",
  "## Manual Journey",
  "## Production Checks",
  "## Accepted First-Test Limitations",
  "## Latest Assessment",
]) {
  expect(runbook.includes(section), `Beta-readiness runbook is missing ${section}.`);
}

if (failures.length > 0) {
  console.error("Beta readiness validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Beta readiness validation passed. Current decision: ${report.decision.toUpperCase()}.`,
);

function validateReport(value) {
  expect(value.schemaVersion === 1, "Beta-readiness schemaVersion must be 1.");
  expect(
    /^\d{4}-\d{2}-\d{2}$/.test(value.assessmentDate ?? ""),
    "Beta-readiness assessmentDate must use YYYY-MM-DD.",
  );
  expect(
    /^[0-9a-f]{7,40}$/.test(value.assessedCommit ?? ""),
    "Beta-readiness assessedCommit must be a Git commit hash.",
  );
  expect(
    value.decision === "go" || value.decision === "no-go",
    "Beta-readiness decision must be go or no-go.",
  );
  expect(Array.isArray(value.checks), "Beta-readiness checks must be an array.");
  expect(
    Array.isArray(value.blockingCheckIds),
    "Beta-readiness blockingCheckIds must be an array.",
  );
  expect(
    Array.isArray(value.knownLimitations) && value.knownLimitations.length > 0,
    "Beta-readiness knownLimitations must document at least one limitation.",
  );
  expect(
    value.automatedVerification?.date === value.assessmentDate,
    "Automated verification date must match the assessment date.",
  );
  expect(
    value.automatedVerification?.result === "pass",
    "Automated verification must record a passing result.",
  );

  const requiredCommands = [
    "npm run beta:check",
    "npm run lint",
    "npm run typecheck",
    "npm test",
    "npm run build",
  ];
  for (const command of requiredCommands) {
    expect(
      value.automatedVerification?.commands?.includes(command),
      `Automated verification must record ${command}.`,
    );
  }

  expect(
    value.automatedVerification?.localHttpSmoke?.statusCode === 200,
    "Local sign-in smoke must record HTTP 200.",
  );
  expect(
    value.automatedVerification?.localHttpSmoke?.signInSurfacePresent === true,
    "Local sign-in smoke must confirm the sign-in surface.",
  );
  expect(
    value.automatedVerification?.localHttpSmoke
      ?.deploymentConfigurationAlertPresent === false,
    "Local sign-in smoke must not report a deployment-configuration alert.",
  );

  if (!Array.isArray(value.checks) || !Array.isArray(value.blockingCheckIds)) {
    return;
  }

  const checksById = new Map();
  const allowedStatuses = new Set(["pass", "failed", "blocked", "pending-manual"]);

  for (const check of value.checks) {
    expect(
      typeof check?.id === "string" && check.id.length > 0,
      "Every beta-readiness check must have an id.",
    );
    if (typeof check?.id !== "string" || check.id.length === 0) {
      continue;
    }

    expect(!checksById.has(check.id), `Duplicate beta-readiness check: ${check.id}`);
    checksById.set(check.id, check);
    expect(
      typeof check.criterion === "string" && check.criterion.length > 0,
      `${check.id} must describe its acceptance criterion.`,
    );
    expect(
      allowedStatuses.has(check.status),
      `${check.id} has an unsupported status: ${check.status}`,
    );
    expect(
      Array.isArray(check.evidence) && check.evidence.length > 0,
      `${check.id} must include evidence.`,
    );
    expect(
      typeof check.notes === "string" && check.notes.length > 0,
      `${check.id} must include assessment notes.`,
    );
  }

  for (const [checkId, requiredEvidence] of requiredChecks) {
    const check = checksById.get(checkId);
    expect(Boolean(check), `Missing beta-readiness check: ${checkId}`);

    if (!check || !Array.isArray(check.evidence)) {
      continue;
    }

    for (const evidencePath of requiredEvidence) {
      expect(
        check.evidence.includes(evidencePath),
        `${checkId} must cite ${evidencePath}.`,
      );
      expect(existsSync(resolve(evidencePath)), `Missing cited evidence: ${evidencePath}`);
    }
  }

  for (const checkId of checksById.keys()) {
    expect(requiredChecks.has(checkId), `Unknown beta-readiness check: ${checkId}`);
  }

  const expectedBlockingIds = value.checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.id)
    .sort();
  const recordedBlockingIds = [...new Set(value.blockingCheckIds)].sort();

  expect(
    arraysEqual(expectedBlockingIds, recordedBlockingIds),
    "blockingCheckIds must exactly match checks whose status is not pass.",
  );

  if (value.decision === "go") {
    expect(
      expectedBlockingIds.length === 0,
      "A GO decision cannot include failed, blocked, or pending checks.",
    );
  } else {
    expect(
      expectedBlockingIds.length > 0,
      "A NO-GO decision must identify at least one blocking check.",
    );
  }

  if (requireGo) {
    expect(
      value.decision === "go" && expectedBlockingIds.length === 0,
      `A GO assessment is required; current decision is ${value.decision.toUpperCase()} with ${expectedBlockingIds.length} blocking checks.`,
    );
  }

  const limitationSeverities = new Set(["accepted", "blocking"]);
  for (const limitation of value.knownLimitations ?? []) {
    expect(
      limitationSeverities.has(limitation?.severity),
      "Every known limitation must be accepted or blocking.",
    );
    expect(
      typeof limitation?.ticket === "string" && limitation.ticket.length > 0,
      "Every known limitation must reference a ticket.",
    );
    expect(
      typeof limitation?.summary === "string" && limitation.summary.length > 0,
      "Every known limitation must include a summary.",
    );
  }
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

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
