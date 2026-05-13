import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/invite/[token]/page.tsx",
  "apps/web/src/campaigns/invites.ts",
  "apps/web/src/components/campaign-invite-panel.tsx",
  "docs/engineering/campaign-invites.md",
  "packages/db/migrations/0006_campaign_invites.sql",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing campaign invite file: ${file}`);
}

const schemaText = readText("packages/db/src/schema.ts");
for (const snippet of [
  '"campaign_invites"',
  '"campaign_invite_acceptances"',
  "token_hash text not null unique",
  "revoked_at timestamptz",
  "campaign_invites_campaign_unrevoked_unique_idx",
  "campaign_invite_acceptances_invite_user_unique",
]) {
  expect(schemaText.includes(snippet), `Invite schema is missing: ${snippet}`);
}

const migrationText = readText("packages/db/migrations/0006_campaign_invites.sql");
for (const snippet of [
  "create table if not exists campaign_invites",
  "token_hash text not null unique",
  "create index if not exists campaign_invites_campaign_active_idx",
  "create unique index if not exists campaign_invites_campaign_unrevoked_unique_idx",
  "create table if not exists campaign_invite_acceptances",
]) {
  expect(migrationText.includes(snippet), `Invite migration is missing: ${snippet}`);
}

const inviteModule = readText("apps/web/src/campaigns/invites.ts");
for (const snippet of [
  "randomBytes",
  "createHash",
  "campaign_memberships.role = 'dm'",
  "values ($1, $2, 'player')",
  "on conflict (campaign_id, user_id) do nothing",
  "for update of campaigns",
  "for update of campaign_invites",
  "revoked_at is null",
]) {
  expect(inviteModule.includes(snippet), `Invite repository is missing: ${snippet}`);
}

const actionsText = readText("apps/web/src/campaigns/actions.ts");
for (const snippet of [
  "generateCampaignInviteAction",
  "revokeCampaignInviteAction",
  "acceptCampaignInviteAction",
  "headers()",
  "sign-in?next",
]) {
  expect(actionsText.includes(snippet), `Invite actions are missing: ${snippet}`);
}

const panelText = readText("apps/web/src/components/campaign-invite-panel.tsx");
for (const snippet of [
  "useActionState",
  "Generated invite link",
  "Rotate invite link",
  "Revoke active link",
]) {
  expect(panelText.includes(snippet), `Invite panel is missing: ${snippet}`);
}

const invitePageText = readText("apps/web/src/app/invite/[token]/page.tsx");
for (const snippet of [
  "getAuthSession",
  "Sign in to join",
  "acceptCampaignInviteAction",
  "expired",
  "revoked",
  "invalid",
]) {
  expect(invitePageText.includes(snippet), `Invite page is missing: ${snippet}`);
}

expect(
  readText("apps/web/src/auth/session.ts").includes('"/invite"'),
  "Sign-in safe return paths must include invite links.",
);
expect(
  readText("apps/web/src/components/campaign-shell.tsx").includes("CampaignInvitePanel"),
  "Campaign dashboard must surface the invite panel.",
);

const docsText = readText("docs/engineering/campaign-invites.md");
for (const snippet of ["token hashes", "revoked", "expire", "player"]) {
  expect(docsText.includes(snippet), `Invite docs are missing: ${snippet}`);
}

if (failures.length > 0) {
  console.error("Campaign invite validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Campaign invite validation passed.");

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
