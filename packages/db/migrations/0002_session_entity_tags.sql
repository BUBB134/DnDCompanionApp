create table session_entity_tags (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  entity_id uuid not null references entities (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint session_entity_tags_session_entity_unique unique (session_id, entity_id)
);

create index session_entity_tags_session_id_idx
  on session_entity_tags (session_id);

create index session_entity_tags_entity_id_idx
  on session_entity_tags (entity_id);
