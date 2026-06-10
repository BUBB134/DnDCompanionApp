alter table sessions
  add column if not exists recap_grounding jsonb not null default '[]'::jsonb;
