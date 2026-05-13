create table if not exists campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  token_hash text not null unique,
  created_by_user_id uuid references users (id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists campaign_invites_campaign_active_idx
  on campaign_invites (campaign_id, expires_at)
  where revoked_at is null;

create table if not exists campaign_invite_acceptances (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references campaign_invites (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  accepted_at timestamptz not null default now(),
  constraint campaign_invite_acceptances_invite_user_unique unique (invite_id, user_id)
);
