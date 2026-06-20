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
  "character_creation_options",
  "spell_definitions",
  "character_spells",
  "character_spell_slots",
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
    recap_grounding jsonb not null default '[]'::jsonb,
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
    level integer not null default 1 check (level between 1 and 20),
    ancestry text,
    background text,
    backstory text not null default '',
    goals text not null default '',
    relationships text not null default '',
    inventory_notes text not null default '',
    personal_notes text not null default '',
    visibility visibility not null default 'player-safe',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create index characters_campaign_owner_idx
    on characters (campaign_id, owner_user_id, updated_at desc);`,
  `create table character_creation_options (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    category text not null check (
      category in ('class', 'ancestry', 'background', 'roleplay-trait')
    ),
    name text not null,
    summary text not null,
    gameplay text not null default '',
    flavour text not null default '',
    actions jsonb not null default '[]'::jsonb,
    traits jsonb not null default '[]'::jsonb,
    proficiencies jsonb not null default '[]'::jsonb,
    quirks jsonb not null default '[]'::jsonb,
    ability_summaries jsonb not null default '[]'::jsonb,
    magic_capable boolean not null default false,
    source text not null default 'dnd-companion-mvp',
    source_version text not null default '2026-06-mvp',
    display_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create index character_creation_options_category_order_idx
    on character_creation_options (category, display_order, name);`,
  `create table spell_definitions (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid references campaigns (id) on delete cascade,
    slug text not null,
    name text not null,
    spell_level integer not null check (spell_level between 0 and 9),
    school text not null,
    casting_time text not null,
    range_text text not null,
    duration text not null,
    concentration boolean not null default false,
    ritual boolean not null default false,
    summary text not null,
    class_names text[] not null default '{}'::text[],
    visibility visibility not null default 'player-safe',
    source text not null default 'dnd-companion-mvp',
    source_version text not null default '2026-06-mvp',
    display_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create unique index spell_definitions_global_slug_unique_idx
    on spell_definitions (slug)
    where campaign_id is null;`,
  `create unique index spell_definitions_campaign_slug_unique_idx
    on spell_definitions (campaign_id, slug)
    where campaign_id is not null;`,
  `create index spell_definitions_lookup_idx
    on spell_definitions (campaign_id, spell_level, visibility, display_order, name);`,
  `create index spell_definitions_class_names_idx
    on spell_definitions using gin (class_names);`,
  `create table character_spells (
    id uuid primary key default gen_random_uuid(),
    character_id uuid not null references characters (id) on delete cascade,
    spell_id uuid not null references spell_definitions (id) on delete cascade,
    preparation_state text not null check (
      preparation_state in ('known', 'prepared')
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint character_spells_character_spell_unique
      unique (character_id, spell_id)
  );`,
  `create index character_spells_character_idx
    on character_spells (character_id, preparation_state, updated_at desc);`,
  `create table character_spell_slots (
    id uuid primary key default gen_random_uuid(),
    character_id uuid not null references characters (id) on delete cascade,
    spell_level integer not null check (spell_level between 1 and 9),
    total_slots integer not null check (total_slots between 1 and 9),
    used_slots integer not null default 0 check (
      used_slots between 0 and total_slots
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint character_spell_slots_character_level_unique
      unique (character_id, spell_level)
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
    campaign_id uuid references campaigns (id) on delete cascade,
    slug text not null,
    category rule_snippet_category not null,
    content_key text not null,
    source text not null default 'system',
    source_version text not null default 'mvp',
    title text not null,
    summary text not null,
    body text not null default '',
    aliases text[] not null default '{}'::text[],
    tags text[] not null default '{}'::text[],
    visibility visibility not null default 'player-safe',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );`,
  `create unique index rule_snippets_global_slug_unique_idx
    on rule_snippets (slug)
    where campaign_id is null;`,
  `create unique index rule_snippets_campaign_slug_unique_idx
    on rule_snippets (campaign_id, slug)
    where campaign_id is not null;`,
  `create index rule_snippets_lookup_idx
    on rule_snippets (campaign_id, category, visibility, title);`,
  `create index rule_snippets_aliases_idx
    on rule_snippets using gin (aliases);`,
  `create index rule_snippets_tags_idx
    on rule_snippets using gin (tags);`,
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
