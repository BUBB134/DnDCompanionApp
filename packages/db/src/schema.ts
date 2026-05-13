import {
  campaignRoles,
  entityTypes,
  ruleSnippetCategories,
  visibilities,
} from "@dnd/types";

const noteScopes = ["campaign", "session", "character"] as const;

export const coreTableNames = [
  "users",
  "campaigns",
  "campaign_memberships",
  "campaign_invites",
  "campaign_invite_acceptances",
  "sessions",
  "characters",
  "entities",
  "session_entity_tags",
  "notes",
  "rule_snippets",
  "ability_summaries",
] as const;

export const migrationTableName = "schema_migrations";

export const baselineSchemaStatements = [
  'create extension if not exists "pgcrypto";',
  `create type campaign_role as enum (${quoteValues(campaignRoles)});`,
  `create type entity_type as enum (${quoteValues(entityTypes)});`,
  `create type note_scope as enum (${quoteValues(noteScopes)});`,
  `create type rule_snippet_category as enum (${quoteValues(ruleSnippetCategories)});`,
  `create type visibility as enum (${quoteValues(visibilities)});`,
  `create table users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create table campaigns (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    summary text,
    ruleset text not null default 'D&D 5e',
    tone text,
    starting_location text,
    onboarding_completed_at timestamptz,
    created_by_user_id uuid references users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create table campaign_memberships (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    role campaign_role not null,
    joined_at timestamptz not null default now(),
    constraint campaign_memberships_campaign_user_unique unique (campaign_id, user_id)
  );`,
  `create table campaign_invites (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns (id) on delete cascade,
    token_hash text not null unique,
    created_by_user_id uuid references users (id) on delete set null,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
  );`,
  `create index campaign_invites_campaign_active_idx
    on campaign_invites (campaign_id, expires_at)
    where revoked_at is null;`,
  `create unique index campaign_invites_campaign_unrevoked_unique_idx
    on campaign_invites (campaign_id)
    where revoked_at is null;`,
  `create table campaign_invite_acceptances (
    id uuid primary key default gen_random_uuid(),
    invite_id uuid not null references campaign_invites (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    accepted_at timestamptz not null default now(),
    constraint campaign_invite_acceptances_invite_user_unique unique (invite_id, user_id)
  );`,
  `create table sessions (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns (id) on delete cascade,
    title text not null,
    recap text not null default '',
    notes text not null default '',
    notes_document jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
    started_at timestamptz,
    ended_at timestamptz,
    unresolved_hooks jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create table characters (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns (id) on delete cascade,
    owner_user_id uuid references users (id) on delete set null,
    name text not null,
    summary text not null default '',
    class_name text,
    level integer not null default 1,
    visibility visibility not null default 'player-safe',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create table entities (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns (id) on delete cascade,
    type entity_type not null,
    name text not null,
    summary text not null default '',
    description text not null default '',
    visibility visibility not null default 'player-safe',
    dm_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create table session_entity_tags (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references sessions (id) on delete cascade,
    entity_id uuid not null references entities (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint session_entity_tags_session_entity_unique unique (session_id, entity_id)
  );`,
  `create index session_entity_tags_session_id_idx
    on session_entity_tags (session_id);`,
  `create index session_entity_tags_entity_id_idx
    on session_entity_tags (entity_id);`,
  `create table notes (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns (id) on delete cascade,
    session_id uuid references sessions (id) on delete set null,
    author_user_id uuid references users (id) on delete set null,
    scope note_scope not null default 'campaign',
    title text not null,
    body text not null default '',
    visibility visibility not null default 'player-safe',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create table rule_snippets (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    category rule_snippet_category not null,
    title text not null,
    summary text not null,
    body text not null default '',
    aliases text[] not null default '{}'::text[],
    visibility visibility not null default 'player-safe',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create table ability_summaries (
    id uuid primary key default gen_random_uuid(),
    character_id uuid not null references characters (id) on delete cascade,
    name text not null,
    summary text not null,
    trigger text,
    visibility visibility not null default 'player-safe',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
] as const;

export const baselineSchemaSql = `${baselineSchemaStatements.join("\n\n")}\n`;

function quoteValues(values: readonly string[]) {
  return values.map((value) => `'${value}'`).join(", ");
}
