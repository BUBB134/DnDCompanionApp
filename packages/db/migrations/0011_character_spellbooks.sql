create table if not exists spell_definitions (
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
);

create unique index if not exists spell_definitions_global_slug_unique_idx
  on spell_definitions (slug)
  where campaign_id is null;

create unique index if not exists spell_definitions_campaign_slug_unique_idx
  on spell_definitions (campaign_id, slug)
  where campaign_id is not null;

create index if not exists spell_definitions_lookup_idx
  on spell_definitions (
    campaign_id,
    spell_level,
    visibility,
    display_order,
    name
  );

create index if not exists spell_definitions_class_names_idx
  on spell_definitions using gin (class_names);

create table if not exists character_spells (
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
);

create index if not exists character_spells_character_idx
  on character_spells (character_id, preparation_state, updated_at desc);

create table if not exists character_spell_slots (
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
);

insert into spell_definitions (
  slug,
  name,
  spell_level,
  school,
  casting_time,
  range_text,
  duration,
  concentration,
  ritual,
  summary,
  class_names,
  visibility,
  source,
  source_version,
  display_order
) values
  (
    'guidance',
    'Guidance',
    0,
    'Divination',
    '1 action',
    'Touch',
    'Concentration, up to 1 minute',
    true,
    false,
    'Encourage a nearby creature with a brief magical edge on one ability check.',
    array['cleric'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    10
  ),
  (
    'sacred-flame',
    'Sacred Flame',
    0,
    'Evocation',
    '1 action',
    '60 feet',
    'Instantaneous',
    false,
    false,
    'Call down radiant fire on a creature that fails to evade the effect.',
    array['cleric'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    20
  ),
  (
    'fire-bolt',
    'Fire Bolt',
    0,
    'Evocation',
    '1 action',
    '120 feet',
    'Instantaneous',
    false,
    false,
    'Hurl a mote of fire at a distant target with a ranged spell attack.',
    array['wizard'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    30
  ),
  (
    'mage-hand',
    'Mage Hand',
    0,
    'Conjuration',
    '1 action',
    '30 feet',
    '1 minute',
    false,
    false,
    'Create a spectral hand that can manipulate a small object at a distance.',
    array['wizard'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    40
  ),
  (
    'bless',
    'Bless',
    1,
    'Enchantment',
    '1 action',
    '30 feet',
    'Concentration, up to 1 minute',
    true,
    false,
    'Bolster up to three allies so their attacks and saving throws are more reliable.',
    array['cleric'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    110
  ),
  (
    'cure-wounds',
    'Cure Wounds',
    1,
    'Abjuration',
    '1 action',
    'Touch',
    'Instantaneous',
    false,
    false,
    'Restore a modest amount of vitality to a creature you can reach.',
    array['cleric'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    120
  ),
  (
    'magic-missile',
    'Magic Missile',
    1,
    'Evocation',
    '1 action',
    '120 feet',
    'Instantaneous',
    false,
    false,
    'Send several darts of force that strike creatures you can see.',
    array['wizard'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    130
  ),
  (
    'shield',
    'Shield',
    1,
    'Abjuration',
    '1 reaction',
    'Self',
    '1 round',
    false,
    false,
    'Raise a sudden magical barrier when an attack is about to land.',
    array['wizard'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    140
  ),
  (
    'spiritual-weapon',
    'Spiritual Weapon',
    2,
    'Evocation',
    '1 bonus action',
    '60 feet',
    '1 minute',
    false,
    false,
    'Manifest a floating weapon that can strike nearby enemies as you direct it.',
    array['cleric'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    210
  ),
  (
    'misty-step',
    'Misty Step',
    2,
    'Conjuration',
    '1 bonus action',
    'Self',
    'Instantaneous',
    false,
    false,
    'Briefly vanish in silver mist and reappear at a nearby place you can see.',
    array['wizard'],
    'player-safe',
    'dnd-companion-mvp',
    '2026-06-mvp',
    220
  )
on conflict (slug) where campaign_id is null do update
set
  name = excluded.name,
  spell_level = excluded.spell_level,
  school = excluded.school,
  casting_time = excluded.casting_time,
  range_text = excluded.range_text,
  duration = excluded.duration,
  concentration = excluded.concentration,
  ritual = excluded.ritual,
  summary = excluded.summary,
  class_names = excluded.class_names,
  visibility = excluded.visibility,
  source = excluded.source,
  source_version = excluded.source_version,
  display_order = excluded.display_order,
  updated_at = now();
