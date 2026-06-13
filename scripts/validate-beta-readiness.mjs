import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = "docs/engineering/first-campaign-beta-readiness.json";
const runbookPath = "docs/engineering/first-campaign-beta-readiness.md";
const workflowPath = ".github/workflows/beta-readiness.yml";
const requireGo = process.argv.includes("--require-go");
const releaseSha = readOption(process.argv.slice(2), "--release-sha");
const releaseDeploymentUrl = readOption(
  process.argv.slice(2),
  "--deployment-url",
);
const failures = [];
const assessmentArtifactPaths = new Set([reportPath, runbookPath]);
const manualCheckIds = new Set([
  "dm-managed-auth",
  "player-managed-auth",
  "campaign-create",
  "campaign-invite",
  "player-join",
  "session-create-open",
  "notes-save-reload",
  "character-companion",
  "mobile-main-flows",
  "production-deployment",
]);

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

for (const path of [reportPath, runbookPath, workflowPath]) {
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

expect(
  !runbook.includes("`workflowUrl`"),
  "Manual rehearsal evidence must not depend on a pre-existing workflow run.",
);

const workflow = readText(workflowPath);
for (const snippet of [
  "fetch-depth: 0",
  '--expect-revision="$READINESS_RELEASE_SHA"',
  '--deployment-url="$DEPLOYMENT_URL"',
]) {
  expect(
    workflow.includes(snippet),
    `Beta-readiness workflow is missing release binding: ${snippet}`,
  );
}

if (report) {
  validateRunbookAssessment(report, runbook);
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

  const limitationSeverities = new Set(["accepted", "blocking"]);
  const blockingLimitations = [];
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

    if (limitation?.severity === "blocking") {
      blockingLimitations.push(limitation);
      expect(
        value.checks.some(
          (check) =>
            check.status !== "pass" &&
            Array.isArray(check.evidence) &&
            check.evidence.some((evidence) =>
              evidence.includes(limitation.ticket),
            ),
        ),
        `Blocking limitation ${limitation.ticket} must map to a non-passing check.`,
      );
    }
  }

  if (value.decision === "go") {
    expect(
      blockingLimitations.length === 0,
      "A GO decision cannot retain blocking limitations.",
    );
  }

  validateManualEvidence(value, checksById);

  if (requireGo) {
    expect(
      value.decision === "go" &&
        expectedBlockingIds.length === 0 &&
        blockingLimitations.length === 0,
      `A GO assessment is required; current decision is ${value.decision.toUpperCase()} with ${expectedBlockingIds.length} blocking checks and ${blockingLimitations.length} blocking limitations.`,
    );
    expect(
      typeof releaseSha === "string" && releaseSha.length > 0,
      "--require-go must include --release-sha.",
    );
    expect(
      isHttpsUrl(releaseDeploymentUrl),
      "--require-go must include an HTTPS --deployment-url.",
    );

    if (releaseSha) {
      validateReleaseRevision(value, releaseSha);
    }
  }
}

function validateManualEvidence(reportValue, checksById) {
  const passedManualCheckIds = [...manualCheckIds].filter(
    (checkId) => checksById.get(checkId)?.status === "pass",
  );
  const evidence = reportValue.manualRehearsal;

  if (passedManualCheckIds.length === 0) {
    expect(
      evidence === null,
      "manualRehearsal must remain null until at least one manual check passes.",
    );
    return;
  }

  expect(
    evidence && typeof evidence === "object",
    "Passed manual checks require a structured manualRehearsal record.",
  );
  if (!evidence || typeof evidence !== "object") {
    return;
  }

  expect(
    typeof evidence.tester === "string" && evidence.tester.trim().length > 0,
    "manualRehearsal.tester is required.",
  );
  expect(
    isIsoTimestamp(evidence.completedAt),
    "manualRehearsal.completedAt must be an ISO-8601 timestamp.",
  );
  expect(
    typeof evidence.completedAt === "string" &&
      evidence.completedAt.slice(0, 10) === reportValue.assessmentDate,
    "manualRehearsal.completedAt must fall on the report assessmentDate.",
  );
  expect(
    evidence.environment === "production",
    "manualRehearsal.environment must be production.",
  );
  expect(
    isHttpsUrl(evidence.deploymentUrl),
    "manualRehearsal.deploymentUrl must be an HTTPS URL.",
  );
  if (requireGo && isHttpsUrl(releaseDeploymentUrl)) {
    expect(
      normalizeDeploymentUrl(evidence.deploymentUrl) ===
        normalizeDeploymentUrl(releaseDeploymentUrl),
      "manualRehearsal.deploymentUrl must match the deployment URL passed to the final gate.",
    );
  }
  expect(
    evidence.assessedCommit === reportValue.assessedCommit,
    "manualRehearsal.assessedCommit must match the report assessedCommit.",
  );
  expect(
    evidence.result === "pass",
    "manualRehearsal.result must be pass.",
  );
  expect(
    typeof evidence.notes === "string" && evidence.notes.trim().length > 0,
    "manualRehearsal.notes are required.",
  );
  expect(
    Array.isArray(evidence.passedCheckIds),
    "manualRehearsal.passedCheckIds must be an array.",
  );

  if (!Array.isArray(evidence.passedCheckIds)) {
    return;
  }

  for (const checkId of passedManualCheckIds) {
    expect(
      evidence.passedCheckIds.includes(checkId),
      `manualRehearsal must include passed manual check ${checkId}.`,
    );
  }

  for (const checkId of evidence.passedCheckIds) {
    expect(
      manualCheckIds.has(checkId),
      `manualRehearsal includes unknown manual check ${checkId}.`,
    );
    expect(
      checksById.get(checkId)?.status === "pass",
      `manualRehearsal cannot claim non-passing check ${checkId}.`,
    );
  }
}

function validateReleaseRevision(reportValue, requestedReleaseSha) {
  const releaseCommit = resolveGitCommit(requestedReleaseSha, "release SHA");
  const headCommit = resolveGitCommit("HEAD", "checked-out HEAD");
  const assessedCommit = resolveGitCommit(
    reportValue.assessedCommit,
    "assessedCommit",
  );

  if (!releaseCommit || !headCommit || !assessedCommit) {
    return;
  }

  expect(
    releaseCommit === headCommit,
    `Release SHA ${releaseCommit} does not match checked-out HEAD ${headCommit}.`,
  );

  let changedPaths = [];
  try {
    changedPaths = execFileSync(
      "git",
      ["diff", "--name-only", `${assessedCommit}..${releaseCommit}`, "--"],
      {
        cwd: rootDir,
        encoding: "utf8",
      },
    )
      .split(/\r?\n/u)
      .filter(Boolean);
  } catch (error) {
    failures.push(
      `Unable to compare assessed and release commits: ${readError(error)}`,
    );
    return;
  }

  const unassessedPaths = changedPaths.filter(
    (path) => !assessmentArtifactPaths.has(path),
  );
  expect(
    unassessedPaths.length === 0,
    `Release contains unassessed changes after ${assessedCommit}: ${
      unassessedPaths.join(", ") || "none"
    }.`,
  );
}

function validateRunbookAssessment(reportValue, runbook) {
  expect(
    runbook.includes(`Assessment date: ${reportValue.assessmentDate}`),
    "Runbook assessment date must match the JSON report.",
  );
  expect(
    runbook.includes(
      `Assessed application commit: \`${reportValue.assessedCommit}\``,
    ),
    "Runbook assessed commit must match the JSON report.",
  );
  expect(
    runbook.includes(`Decision: **${reportValue.decision.toUpperCase()}**`),
    "Runbook decision must match the JSON report.",
  );
}

function resolveGitCommit(reference, label) {
  try {
    return execFileSync(
      "git",
      ["rev-parse", "--verify", `${reference}^{commit}`],
      {
        cwd: rootDir,
        encoding: "utf8",
      },
    ).trim();
  } catch (error) {
    failures.push(`Unable to resolve ${label}: ${readError(error)}`);
    return null;
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeDeploymentUrl(value) {
  try {
    const url = new URL(value);

    if (url.username || url.password || url.search || url.hash) {
      return null;
    }

    const pathname = url.pathname.replace(/\/+$/u, "");
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

function isIsoTimestamp(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function readError(error) {
  return error instanceof Error ? error.message : String(error);
}

function readOption(args, name) {
  const assignment = args.find((arg) => arg.startsWith(`${name}=`));

  if (assignment) {
    return assignment.slice(name.length + 1);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
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
