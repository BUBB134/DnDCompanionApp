alter table characters
  add column if not exists ancestry text,
  add column if not exists background text,
  add column if not exists backstory text not null default '',
  add column if not exists goals text not null default '',
  add column if not exists relationships text not null default '',
  add column if not exists inventory_notes text not null default '',
  add column if not exists personal_notes text not null default '';

alter table characters
  add constraint characters_level_range_check
  check (level between 1 and 20);

create index if not exists characters_campaign_owner_idx
  on characters (campaign_id, owner_user_id, updated_at desc);
