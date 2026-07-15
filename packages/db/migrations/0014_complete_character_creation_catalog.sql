-- DND-56: expand the database-backed SRD 5.1 character creation catalogue.
with options(slug, name, category, display_order, magic_capable, feature, summary) as (
  values
    ('barbarian','Barbarian','class',50,false,'Rage','A fierce warrior who turns battle focus into strength and staying power.'),
    ('bard','Bard','class',60,true,'Bardic Inspiration','A performer, diplomat, and spellcaster who helps allies shine.'),
    ('druid','Druid','class',70,true,'Druidic','A keeper of primal magic who adapts through spells and animal forms.'),
    ('monk','Monk','class',80,false,'Martial Arts','A disciplined combatant who relies on speed, focus, and precise technique.'),
    ('paladin','Paladin','class',90,true,'Lay on Hands','An oath-bound champion who protects allies with steel and sacred power.'),
    ('ranger','Ranger','class',100,true,'Favored Enemy','A watchful hunter and guide who excels beyond the safety of roads.'),
    ('sorcerer','Sorcerer','class',110,true,'Sorcerous Origin','An innate spellcaster who bends a focused magical gift in unusual ways.'),
    ('warlock','Warlock','class',120,true,'Pact Magic','A pact-bound spellcaster shaped by potent magic and lasting invocations.'),
    ('gnome','Gnome','ancestry',50,false,'Ancestral Talents','Clever and curious, with a knack for invention and subtle magic.'),
    ('half-elf','Half-Elf','ancestry',60,false,'Ancestral Talents','Adaptable and perceptive, carrying both human and elven heritage.'),
    ('half-orc','Half-Orc','ancestry',70,false,'Ancestral Talents','Powerful and enduring, with a reputation that often arrives first.'),
    ('dragonborn','Dragonborn','ancestry',80,false,'Ancestral Talents','Dragon-blooded and imposing, with elemental power close at hand.'),
    ('tiefling','Tiefling','ancestry',90,false,'Ancestral Talents','Marked by infernal heritage, with innate magic and a memorable presence.')
)
insert into character_creation_options (
  slug, name, category, summary, gameplay, flavour, traits, actions,
  proficiencies, quirks, ability_summaries, magic_capable, source,
  source_version, display_order
)
select
  slug, name, category, summary, summary, summary,
  case when category = 'class'
    then jsonb_build_array('Adventurous','Capable','Distinctive')
    else jsonb_build_array('Distinctive','Resourceful','Connected') end,
  case when category = 'class'
    then jsonb_build_array(feature,'Support the party with class expertise')
    else jsonb_build_array('Draw on ancestral talents','Bring a distinct perspective to the party') end,
  case when category = 'class'
    then jsonb_build_array('Class weapons and tools','Class saving throws')
    else jsonb_build_array('Ancestral resilience','Cultural knowledge') end,
  case when category = 'class'
    then jsonb_build_array('Approaches danger through class training')
    else jsonb_build_array('Carries a tradition from home') end,
  case when category = 'class'
    then jsonb_build_array(
      jsonb_build_object('name', feature, 'summary', 'A defining feature ready for character reminders and the action hotbar.', 'trigger', 'Class feature')
    ) || case when magic_capable then jsonb_build_array(
      jsonb_build_object('name', 'Spellcasting', 'summary', 'Use class magic through the character spellbook.', 'trigger', 'Uses spells and spell slots')
    ) else '[]'::jsonb end
    else '[]'::jsonb
  end,
  magic_capable, 'dnd-5e-srd-5.1-cc', '2026-07-srd-5.1', display_order
from options
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  summary = excluded.summary,
  gameplay = excluded.gameplay,
  flavour = excluded.flavour,
  traits = excluded.traits,
  actions = excluded.actions,
  proficiencies = excluded.proficiencies,
  quirks = excluded.quirks,
  ability_summaries = excluded.ability_summaries,
  magic_capable = excluded.magic_capable,
  source = excluded.source,
  source_version = excluded.source_version,
  display_order = excluded.display_order,
  updated_at = now();
