alter table rule_snippets
  add column if not exists aliases text[] not null default '{}'::text[];

insert into rule_snippets (
  slug,
  category,
  title,
  summary,
  body,
  aliases,
  visibility
) values
  (
    'blinded',
    'condition',
    'Blinded',
    'Use when sight is blocked or a creature cannot see its target.',
    'A blinded creature cannot see. Its attack rolls are hindered, and attacks against it are easier while the attacker can exploit that lack of sight.',
    array['blind', 'blinded'],
    'player-safe'
  ),
  (
    'charmed',
    'condition',
    'Charmed',
    'Use when influence limits hostile action against the charmer.',
    'A charmed creature cannot target the charmer with hostile action and the charmer gains social leverage while interacting with it.',
    array['charm', 'charmed'],
    'player-safe'
  ),
  (
    'deafened',
    'condition',
    'Deafened',
    'Use when hearing-based awareness or effects matter.',
    'A deafened creature cannot hear and automatically fails checks that depend entirely on hearing.',
    array['deaf', 'deafened'],
    'player-safe'
  ),
  (
    'frightened',
    'condition',
    'Frightened',
    'Use when fear affects movement and pressure against a visible source.',
    'A frightened creature has trouble acting while the source of fear is visible and cannot willingly move closer to that source.',
    array['fear', 'frightened'],
    'player-safe'
  ),
  (
    'grappled',
    'condition',
    'Grappled',
    'Use when a creature is held in place by a grappler or effect.',
    'A grappled creature has no effective speed while the grapple lasts. The condition ends if the grappler is incapacitated or the creature is moved out of reach.',
    array['grapple', 'grappled', 'grappling'],
    'player-safe'
  ),
  (
    'incapacitated',
    'condition',
    'Incapacitated',
    'Use when a creature cannot take actions or reactions.',
    'An incapacitated creature cannot take actions or reactions, which often shuts off other active options.',
    array['incapacitated'],
    'player-safe'
  ),
  (
    'invisible',
    'condition',
    'Invisible',
    'Use when unseen positioning affects attacks and targeting.',
    'An invisible creature cannot be seen without special senses or magic. Attacks involving it usually shift advantage based on who can perceive whom.',
    array['invisible', 'invisibility'],
    'player-safe'
  ),
  (
    'paralyzed',
    'condition',
    'Paralyzed',
    'Use when a creature is locked down and especially vulnerable.',
    'A paralyzed creature is incapacitated, cannot move or speak, and is especially vulnerable to nearby attacks.',
    array['paralysis', 'paralyzed'],
    'player-safe'
  ),
  (
    'petrified',
    'condition',
    'Petrified',
    'Use when a creature is transformed into inert solid material.',
    'A petrified creature is incapacitated, cannot move or speak, and becomes highly resistant to many forms of harm while transformed.',
    array['petrified', 'petrification'],
    'player-safe'
  ),
  (
    'poisoned',
    'condition',
    'Poisoned',
    'Use when toxin, venom, or sickness interferes with action.',
    'A poisoned creature struggles with attacks and ability checks until the condition ends.',
    array['poison', 'poisoned'],
    'player-safe'
  ),
  (
    'prone',
    'condition',
    'Prone',
    'Use when a creature is knocked down or chooses to drop low.',
    'A prone creature spends extra movement to stand and has trouble attacking. Nearby attackers can press the advantage, while distant attackers have a harder shot.',
    array['prone', 'knocked down'],
    'player-safe'
  ),
  (
    'restrained',
    'condition',
    'Restrained',
    'Use when bindings, webs, or force limit movement.',
    'A restrained creature has no effective speed, has trouble attacking and avoiding effects, and is easier for attackers to hit.',
    array['restrained', 'restrain'],
    'player-safe'
  ),
  (
    'stunned',
    'condition',
    'Stunned',
    'Use when a creature loses its turn pressure but remains standing.',
    'A stunned creature is incapacitated, cannot move, can barely speak, and is easier to hit while the condition lasts.',
    array['stun', 'stunned'],
    'player-safe'
  ),
  (
    'unconscious',
    'condition',
    'Unconscious',
    'Use when a creature drops, cannot act, and is highly vulnerable.',
    'An unconscious creature is incapacitated, unaware, drops what it holds, falls prone, and is especially vulnerable to nearby attacks.',
    array['unconscious', 'knocked out'],
    'player-safe'
  ),
  (
    'advantage-disadvantage',
    'core-mechanic',
    'Advantage and disadvantage',
    'Roll two d20s and keep the better or worse result.',
    'Advantage means roll two d20s and use the higher result. Disadvantage means roll two d20s and use the lower result. If both apply, they cancel.',
    array['advantage', 'disadvantage'],
    'player-safe'
  ),
  (
    'concentration',
    'core-mechanic',
    'Concentration',
    'Track spell focus, damage checks, and conflicts with other concentration spells.',
    'A creature can concentrate on one qualifying spell at a time. Damage, incapacitation, or certain environmental pressure can force a check or end concentration.',
    array['concentration', 'concentrating'],
    'player-safe'
  ),
  (
    'death-saving-throws',
    'core-mechanic',
    'Death saving throws',
    'Use when a player character starts a turn at 0 hit points.',
    'At 0 hit points, a creature may need death saving throws. Three successes stabilize, three failures can kill, and a natural 20 or damage can shift the situation quickly.',
    array['death save', 'death saves', 'death saving throw', 'death saving throws'],
    'player-safe'
  ),
  (
    'opportunity-attacks',
    'core-mechanic',
    'Opportunity attacks',
    'Use when a creature leaves an enemy reach during movement.',
    'A creature can often use its reaction to make a melee attack when a hostile creature leaves its reach. Forced movement and some movement options may avoid it.',
    array['opportunity attack', 'opportunity attacks'],
    'player-safe'
  )
on conflict (slug) do update
set
  category = excluded.category,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  aliases = excluded.aliases,
  visibility = excluded.visibility,
  updated_at = now();
