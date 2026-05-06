import type { RuleSnippet } from "@dnd/types";

export const coreRuleSnippets: RuleSnippet[] = [
  {
    aliases: ["blind", "blinded"],
    body:
      "A blinded creature cannot see. Its attack rolls are hindered, and attacks against it are easier while the attacker can exploit that lack of sight.",
    category: "condition",
    id: "core-rule-blinded",
    slug: "blinded",
    summary: "Use when sight is blocked or a creature cannot see its target.",
    title: "Blinded",
    visibility: "player-safe",
  },
  {
    aliases: ["charm", "charmed"],
    body:
      "A charmed creature cannot target the charmer with hostile action and the charmer gains social leverage while interacting with it.",
    category: "condition",
    id: "core-rule-charmed",
    slug: "charmed",
    summary: "Use when influence limits hostile action against the charmer.",
    title: "Charmed",
    visibility: "player-safe",
  },
  {
    aliases: ["deaf", "deafened"],
    body:
      "A deafened creature cannot hear and automatically fails checks that depend entirely on hearing.",
    category: "condition",
    id: "core-rule-deafened",
    slug: "deafened",
    summary: "Use when hearing-based awareness or effects matter.",
    title: "Deafened",
    visibility: "player-safe",
  },
  {
    aliases: ["fear", "frightened"],
    body:
      "A frightened creature has trouble acting while the source of fear is visible and cannot willingly move closer to that source.",
    category: "condition",
    id: "core-rule-frightened",
    slug: "frightened",
    summary: "Use when fear affects movement and pressure against a visible source.",
    title: "Frightened",
    visibility: "player-safe",
  },
  {
    aliases: ["grapple", "grappled", "grappling"],
    body:
      "A grappled creature has no effective speed while the grapple lasts. The condition ends if the grappler is incapacitated or the creature is moved out of reach.",
    category: "condition",
    id: "core-rule-grappled",
    slug: "grappled",
    summary: "Use when a creature is held in place by a grappler or effect.",
    title: "Grappled",
    visibility: "player-safe",
  },
  {
    aliases: ["incapacitated"],
    body:
      "An incapacitated creature cannot take actions or reactions, which often shuts off other active options.",
    category: "condition",
    id: "core-rule-incapacitated",
    slug: "incapacitated",
    summary: "Use when a creature cannot take actions or reactions.",
    title: "Incapacitated",
    visibility: "player-safe",
  },
  {
    aliases: ["invisible", "invisibility"],
    body:
      "An invisible creature cannot be seen without special senses or magic. Attacks involving it usually shift advantage based on who can perceive whom.",
    category: "condition",
    id: "core-rule-invisible",
    slug: "invisible",
    summary: "Use when unseen positioning affects attacks and targeting.",
    title: "Invisible",
    visibility: "player-safe",
  },
  {
    aliases: ["paralysis", "paralyzed"],
    body:
      "A paralyzed creature is incapacitated, cannot move or speak, and is especially vulnerable to nearby attacks.",
    category: "condition",
    id: "core-rule-paralyzed",
    slug: "paralyzed",
    summary: "Use when a creature is locked down and especially vulnerable.",
    title: "Paralyzed",
    visibility: "player-safe",
  },
  {
    aliases: ["petrified", "petrification"],
    body:
      "A petrified creature is incapacitated, cannot move or speak, and becomes highly resistant to many forms of harm while transformed.",
    category: "condition",
    id: "core-rule-petrified",
    slug: "petrified",
    summary: "Use when a creature is transformed into inert solid material.",
    title: "Petrified",
    visibility: "player-safe",
  },
  {
    aliases: ["poison", "poisoned"],
    body:
      "A poisoned creature struggles with attacks and ability checks until the condition ends.",
    category: "condition",
    id: "core-rule-poisoned",
    slug: "poisoned",
    summary: "Use when toxin, venom, or sickness interferes with action.",
    title: "Poisoned",
    visibility: "player-safe",
  },
  {
    aliases: ["prone", "knocked down"],
    body:
      "A prone creature spends extra movement to stand and has trouble attacking. Nearby attackers can press the advantage, while distant attackers have a harder shot.",
    category: "condition",
    id: "core-rule-prone",
    slug: "prone",
    summary: "Use when a creature is knocked down or chooses to drop low.",
    title: "Prone",
    visibility: "player-safe",
  },
  {
    aliases: ["restrained", "restrain"],
    body:
      "A restrained creature has no effective speed, has trouble attacking and avoiding effects, and is easier for attackers to hit.",
    category: "condition",
    id: "core-rule-restrained",
    slug: "restrained",
    summary: "Use when bindings, webs, or force limit movement.",
    title: "Restrained",
    visibility: "player-safe",
  },
  {
    aliases: ["stun", "stunned"],
    body:
      "A stunned creature is incapacitated, cannot move, can barely speak, and is easier to hit while the condition lasts.",
    category: "condition",
    id: "core-rule-stunned",
    slug: "stunned",
    summary:
      "Use when a creature loses its turn pressure but remains standing.",
    title: "Stunned",
    visibility: "player-safe",
  },
  {
    aliases: ["unconscious", "knocked out"],
    body:
      "An unconscious creature is incapacitated, unaware, drops what it holds, falls prone, and is especially vulnerable to nearby attacks.",
    category: "condition",
    id: "core-rule-unconscious",
    slug: "unconscious",
    summary: "Use when a creature drops, cannot act, and is highly vulnerable.",
    title: "Unconscious",
    visibility: "player-safe",
  },
  {
    aliases: ["advantage", "disadvantage"],
    body:
      "Advantage means roll two d20s and use the higher result. Disadvantage means roll two d20s and use the lower result. If both apply, they cancel.",
    category: "core-mechanic",
    id: "core-rule-advantage-disadvantage",
    slug: "advantage-disadvantage",
    summary: "Roll two d20s and keep the better or worse result.",
    title: "Advantage and disadvantage",
    visibility: "player-safe",
  },
  {
    aliases: ["concentration", "concentrating"],
    body:
      "A creature can concentrate on one qualifying spell at a time. Damage, incapacitation, or certain environmental pressure can force a check or end concentration.",
    category: "core-mechanic",
    id: "core-rule-concentration",
    slug: "concentration",
    summary:
      "Track spell focus, damage checks, and conflicts with other concentration spells.",
    title: "Concentration",
    visibility: "player-safe",
  },
  {
    aliases: [
      "death save",
      "death saves",
      "death saving throw",
      "death saving throws",
    ],
    body:
      "At 0 hit points, a creature may need death saving throws. Three successes stabilize, three failures can kill, and a natural 20 or damage can shift the situation quickly.",
    category: "core-mechanic",
    id: "core-rule-death-saving-throws",
    slug: "death-saving-throws",
    summary: "Use when a player character starts a turn at 0 hit points.",
    title: "Death saving throws",
    visibility: "player-safe",
  },
  {
    aliases: ["opportunity attack", "opportunity attacks"],
    body:
      "A creature can often use its reaction to make a melee attack when a hostile creature leaves its reach. Forced movement and some movement options may avoid it.",
    category: "core-mechanic",
    id: "core-rule-opportunity-attacks",
    slug: "opportunity-attacks",
    summary: "Use when a creature leaves an enemy reach during movement.",
    title: "Opportunity attacks",
    visibility: "player-safe",
  },
];
