create extension if not exists "pgcrypto";

create type campaign_role as enum ('dm', 'player');
create type entity_type as enum ('npc', 'location', 'faction', 'quest', 'item');
create type note_scope as enum ('campaign', 'session', 'character');
create type rule_snippet_category as enum ('condition', 'core-mechanic', 'ability');
create type visibility as enum ('dm-only', 'player-safe');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  created_by_user_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_memberships (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role campaign_role not null,
  joined_at timestamptz not null default now(),
  constraint campaign_memberships_campaign_user_unique unique (campaign_id, user_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  title text not null,
  recap text not null default '',
  notes text not null default '',
  started_at timestamptz,
  ended_at timestamptz,
  unresolved_hooks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table characters (
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
);

create table entities (
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
);

create table notes (
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
);

create table rule_snippets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category rule_snippet_category not null,
  title text not null,
  summary text not null,
  body text not null default '',
  visibility visibility not null default 'player-safe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ability_summaries (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  name text not null,
  summary text not null,
  trigger text,
  visibility visibility not null default 'player-safe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
