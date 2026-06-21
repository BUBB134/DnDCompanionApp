import type {
  CampaignCharacterFullView,
  CharacterCreationOption,
  CharacterSpell,
  CharacterSpellbook,
  CharacterSpellSlot,
  RuleSnippet,
} from "@dnd/types";

export const actionHotbarCategories = [
  "actions",
  "bonus-actions",
  "reactions",
  "spells",
  "features",
] as const;

export type ActionHotbarCategory =
  (typeof actionHotbarCategories)[number];

export type CharacterActionHotbarItem = {
  actionCategory: ActionHotbarCategory | null;
  available: boolean;
  category: ActionHotbarCategory;
  cost: string | null;
  duration: string | null;
  id: string;
  name: string;
  range: string | null;
  resource: string | null;
  slotLevel: number | null;
  source: string;
  summary: string;
  unavailableReason: string | null;
};

export type CharacterActionHotbarModel = {
  isMagicCapable: boolean;
  items: CharacterActionHotbarItem[];
  slots: CharacterSpellSlot[];
};

export function buildCharacterActionHotbar(
  character: CampaignCharacterFullView,
  spellbook: CharacterSpellbook | null,
  creationOptions: CharacterCreationOption[],
  commonActionRules: RuleSnippet[],
): CharacterActionHotbarModel {
  const matchedOptions = matchCharacterCreationOptions(
    character,
    creationOptions,
  );
  const items = [
    ...commonActionRules.map(mapCommonActionRule),
    ...character.abilities.map((ability) => ({
      actionCategory: classifyActionCategory(ability.trigger),
      available: true,
      category: classifyAbilityCategory(ability.trigger),
      cost: ability.trigger || null,
      duration: null,
      id: `ability:${ability.id}`,
      name: ability.name,
      range: null,
      resource: ability.trigger || null,
      slotLevel: null,
      source: "Character ability",
      summary: ability.summary,
      unavailableReason: null,
    })),
    ...matchedOptions.flatMap(mapCreationOptionItems),
    ...(spellbook?.spells.map((spell) =>
      mapSpell(spell, spellbook.slots),
    ) ?? []),
  ];

  return {
    isMagicCapable: spellbook?.isMagicCapable ?? false,
    items: deduplicateItems(items),
    slots: spellbook?.slots ?? [],
  };
}

function matchCharacterCreationOptions(
  character: CampaignCharacterFullView,
  options: CharacterCreationOption[],
) {
  const profileValues = new Map([
    ["class", character.className],
    ["ancestry", character.ancestry],
    ["background", character.background],
  ]);

  return options.filter((option) => {
    const profileValue = profileValues.get(option.category);

    return (
      typeof profileValue === "string" &&
      normalizeName(profileValue) === normalizeName(option.name)
    );
  });
}

function mapCreationOptionItems(
  option: CharacterCreationOption,
): CharacterActionHotbarItem[] {
  const source = `${option.name} ${formatOptionCategory(option.category)}`;
  const actionItems = option.actions.map((action, index) => ({
    actionCategory: "actions" as const,
    available: true,
    category: "actions" as const,
    cost: "Action",
    duration: null,
    id: `option:${option.slug}:action:${index}`,
    name: action,
    range: null,
    resource: null,
    slotLevel: null,
    source,
    summary: option.gameplay || option.summary,
    unavailableReason: null,
  }));
  const featureItems: CharacterActionHotbarItem[] = [];

  if (option.traits.length > 0) {
    featureItems.push({
      actionCategory: null,
      available: true,
      category: "features",
      cost: null,
      duration: null,
      id: `option:${option.slug}:traits`,
      name: `${option.name} traits`,
      range: null,
      resource: null,
      slotLevel: null,
      source,
      summary: option.traits.join(" · "),
      unavailableReason: null,
    });
  }

  if (option.quirks.length > 0) {
    featureItems.push({
      actionCategory: null,
      available: true,
      category: "features",
      cost: null,
      duration: null,
      id: `option:${option.slug}:quirks`,
      name: `${option.name} quirks`,
      range: null,
      resource: null,
      slotLevel: null,
      source,
      summary: option.quirks.join(" · "),
      unavailableReason: null,
    });
  }

  return [...actionItems, ...featureItems];
}

function mapCommonActionRule(rule: RuleSnippet): CharacterActionHotbarItem {
  return {
    actionCategory: classifyRuleCategory(rule),
    available: true,
    category: classifyRuleCategory(rule),
    cost: rule.tags?.includes("reaction")
      ? "Reaction"
      : rule.tags?.includes("bonus-action")
        ? "Bonus action"
        : "Action",
    duration: null,
    id: `rule:${rule.id}`,
    name: rule.title,
    range: null,
    resource: null,
    slotLevel: null,
    source: "Common action",
    summary: rule.body,
    unavailableReason: null,
  };
}

function mapSpell(
  spell: CharacterSpell,
  slots: CharacterSpellSlot[],
): CharacterActionHotbarItem {
  const isCantrip = spell.level === 0;
  const isPrepared = isCantrip || spell.preparation === "prepared";
  const slot = isCantrip ? null : findLowestAvailableSlot(spell.level, slots);
  const hasSlot = isCantrip || slot !== null;
  const unavailableReason = !isPrepared
    ? "This spell is known but not prepared."
    : !hasSlot
      ? `No level ${spell.level} or higher spell slots are available.`
      : null;

  return {
    actionCategory: classifyActionCategory(spell.castingTime),
    available: unavailableReason === null,
    category: "spells",
    cost: spell.castingTime,
    duration: spell.duration,
    id: `spell:${spell.id}`,
    name: spell.name,
    range: spell.range,
    resource: isCantrip
      ? "At will"
      : slot
        ? `${slot.total - slot.used} of ${slot.total} level ${slot.level} slots available`
        : `No level ${spell.level} or higher slots available`,
    slotLevel: slot?.level ?? null,
    source: `${spell.school} spell`,
    summary: spell.summary,
    unavailableReason,
  };
}

function classifyAbilityCategory(
  trigger: string | null | undefined,
): ActionHotbarCategory {
  return classifyActionCategory(trigger) ?? "features";
}

function classifyActionCategory(
  trigger: string | null | undefined,
): ActionHotbarCategory | null {
  const normalizedTrigger = trigger?.toLowerCase() ?? "";

  if (normalizedTrigger.includes("bonus action")) {
    return "bonus-actions";
  }

  if (normalizedTrigger.includes("reaction")) {
    return "reactions";
  }

  if (normalizedTrigger.includes("action")) {
    return "actions";
  }

  return null;
}

function classifyRuleCategory(rule: RuleSnippet): ActionHotbarCategory {
  if (rule.tags?.includes("reaction")) {
    return "reactions";
  }

  if (rule.tags?.includes("bonus-action")) {
    return "bonus-actions";
  }

  return "actions";
}

function formatOptionCategory(
  category: CharacterCreationOption["category"],
) {
  if (category === "class") {
    return "class";
  }

  if (category === "ancestry") {
    return "ancestry";
  }

  return category === "background" ? "background" : "roleplay direction";
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function findLowestAvailableSlot(
  spellLevel: number,
  slots: CharacterSpellSlot[],
) {
  return (
    slots
      .filter(
        (slot) => slot.level >= spellLevel && slot.total - slot.used > 0,
      )
      .sort((left, right) => left.level - right.level)[0] ?? null
  );
}

function deduplicateItems(items: CharacterActionHotbarItem[]) {
  const uniqueItems = new Map<string, CharacterActionHotbarItem>();

  for (const item of items) {
    const key = `${item.category}:${normalizeName(item.name)}`;

    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, item);
    }
  }

  return [...uniqueItems.values()];
}
