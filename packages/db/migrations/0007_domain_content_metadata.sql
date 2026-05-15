alter table rule_snippets
  add column if not exists campaign_id uuid references campaigns (id) on delete cascade,
  add column if not exists content_key text,
  add column if not exists source text not null default 'system',
  add column if not exists source_version text not null default 'mvp',
  add column if not exists tags text[] not null default '{}'::text[];

update rule_snippets
set
  content_key = coalesce(nullif(content_key, ''), concat(category::text, '.', slug)),
  source = case
    when source = 'system' then 'dnd-5e-srd-mvp'
    else source
  end,
  source_version = case
    when source_version = 'mvp' then '2026-05-mvp'
    else source_version
  end,
  tags = case
    when slug = 'blinded' then array['condition', 'combat', 'senses']
    when slug = 'charmed' then array['condition', 'social', 'control']
    when slug = 'deafened' then array['condition', 'senses']
    when slug = 'frightened' then array['condition', 'movement', 'control']
    when slug = 'grappled' then array['condition', 'movement', 'combat']
    when slug = 'incapacitated' then array['condition', 'actions', 'combat']
    when slug = 'invisible' then array['condition', 'senses', 'combat']
    when slug = 'paralyzed' then array['condition', 'movement', 'combat']
    when slug = 'petrified' then array['condition', 'transformation', 'combat']
    when slug = 'poisoned' then array['condition', 'checks', 'combat']
    when slug = 'prone' then array['condition', 'movement', 'combat']
    when slug = 'restrained' then array['condition', 'movement', 'combat']
    when slug = 'stunned' then array['condition', 'actions', 'combat']
    when slug = 'unconscious' then array['condition', 'combat', 'survival']
    when slug = 'advantage-disadvantage' then array['core-mechanic', 'd20', 'checks']
    when slug = 'concentration' then array['core-mechanic', 'spellcasting', 'checks']
    when slug = 'death-saving-throws' then array['core-mechanic', 'survival', 'combat']
    when slug = 'opportunity-attacks' then array['core-mechanic', 'movement', 'reactions']
    when cardinality(tags) = 0 then array[category::text]
    else tags
  end
where campaign_id is null;

alter table rule_snippets
  alter column content_key set not null;

alter table rule_snippets
  drop constraint if exists rule_snippets_slug_key;

create unique index if not exists rule_snippets_global_slug_unique_idx
  on rule_snippets (slug)
  where campaign_id is null;

create unique index if not exists rule_snippets_campaign_slug_unique_idx
  on rule_snippets (campaign_id, slug)
  where campaign_id is not null;

create index if not exists rule_snippets_lookup_idx
  on rule_snippets (campaign_id, category, visibility, title);

create index if not exists rule_snippets_aliases_idx
  on rule_snippets using gin (aliases);

create index if not exists rule_snippets_tags_idx
  on rule_snippets using gin (tags);
