create table if not exists character_level_progressions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  created_by_user_id uuid references users (id) on delete set null,
  from_level integer not null check (from_level between 1 and 19),
  to_level integer not null check (to_level between 2 and 20),
  summary text not null,
  added_abilities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint character_level_progressions_step_check
    check (to_level = from_level + 1),
  constraint character_level_progressions_character_level_unique
    unique (character_id, to_level)
);

create index if not exists character_level_progressions_character_idx
  on character_level_progressions (character_id, to_level desc);
