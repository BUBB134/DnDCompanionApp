import type {
  CharacterCreationAbility,
  CharacterCreationOption,
  CharacterCreationOptionCategory,
} from "@dnd/types";

const requiredOptionCategories: readonly CharacterCreationOptionCategory[] = [
  "class",
  "ancestry",
  "background",
  "roleplay-trait",
];

export function hasCompleteCharacterCreationCatalog(
  options: CharacterCreationOption[],
) {
  return requiredOptionCategories.every((category) =>
    options.some((option) => option.category === category),
  );
}

export function formatCharacterCreationAbilities(
  options: Array<CharacterCreationOption | null | undefined>,
) {
  const abilities = new Map<string, CharacterCreationAbility>();

  for (const option of options) {
    for (const ability of option?.abilities ?? []) {
      abilities.set(ability.name, ability);
    }
  }

  return [...abilities.values()]
    .map((ability) =>
      [ability.name, ability.summary, ability.trigger ?? ""].join(" | "),
    )
    .join("\n");
}
