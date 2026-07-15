import type {
  CharacterCreationAbility,
  CharacterCreationOption,
  CharacterCreationOptionCategory,
} from "@dnd/types";
import type { CharacterFormValues } from "@/characters/manage-character";

const requiredOptionCategories: readonly CharacterCreationOptionCategory[] = [
  "class",
  "ancestry",
  "background",
  "roleplay-trait",
];

const requiredClassOptionSlugs = [
  "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
] as const;

const requiredAncestryOptionSlugs = [
  "dragonborn", "dwarf", "elf", "gnome", "half-elf", "half-orc",
  "halfling", "human", "tiefling",
] as const;

export function hasCompleteCharacterCreationCatalog(
  options: CharacterCreationOption[],
) {
  const optionSlugs = new Set(options.map((option) => option.slug));

  return (
    requiredOptionCategories.every((category) =>
      options.some((option) => option.category === category),
    ) &&
    requiredClassOptionSlugs.every((slug) => optionSlugs.has(slug)) &&
    requiredAncestryOptionSlugs.every((slug) => optionSlugs.has(slug))
  );
}

type GuidedSelectionFields = Pick<
  CharacterFormValues,
  | "ancestryOptionSlug"
  | "backgroundOptionSlug"
  | "classOptionSlug"
  | "roleplayTraitOptionSlug"
>;

type GuidedSelectionFieldErrors = Partial<
  Record<
    "ancestry" | "background" | "className" | "roleplayTraitOptionSlug",
    string
  >
>;

export function resolveGuidedCharacterSelection(
  options: CharacterCreationOption[],
  values: GuidedSelectionFields,
):
  | {
      ancestryOption: CharacterCreationOption;
      backgroundOption: CharacterCreationOption;
      classOption: CharacterCreationOption;
      ok: true;
      roleplayTraitOption: CharacterCreationOption | null;
    }
  | {
      fieldErrors: GuidedSelectionFieldErrors;
      ok: false;
    } {
  const classOption = findCatalogOption(
    options,
    "class",
    values.classOptionSlug,
  );
  const ancestryOption = findCatalogOption(
    options,
    "ancestry",
    values.ancestryOptionSlug,
  );
  const backgroundOption = findCatalogOption(
    options,
    "background",
    values.backgroundOptionSlug,
  );
  const roleplayTraitOption = values.roleplayTraitOptionSlug
    ? findCatalogOption(
        options,
        "roleplay-trait",
        values.roleplayTraitOptionSlug,
      )
    : null;
  const fieldErrors: GuidedSelectionFieldErrors = {};

  if (!classOption) {
    fieldErrors.className =
      "Choose a current class option before creating this character.";
  }

  if (!ancestryOption) {
    fieldErrors.ancestry =
      "Choose a current ancestry or species option before creating this character.";
  }

  if (!backgroundOption) {
    fieldErrors.background =
      "Choose a current background option before creating this character.";
  }

  if (values.roleplayTraitOptionSlug && !roleplayTraitOption) {
    fieldErrors.roleplayTraitOptionSlug =
      "Choose a current roleplay direction or clear the saved choice.";
  }

  if (!classOption || !ancestryOption || !backgroundOption) {
    return {
      fieldErrors,
      ok: false,
    };
  }

  if (values.roleplayTraitOptionSlug && !roleplayTraitOption) {
    return {
      fieldErrors,
      ok: false,
    };
  }

  return {
    ancestryOption,
    backgroundOption,
    classOption,
    ok: true,
    roleplayTraitOption,
  };
}

export function resolveOptionalRoleplayTraitSlug(
  options: CharacterCreationOption[],
  slug: string,
) {
  return findCatalogOption(options, "roleplay-trait", slug)?.slug ?? "";
}

type CharacterCreationStepValues = Pick<
  CharacterFormValues,
  "ancestry" | "background" | "className" | "level" | "name" | "summary"
>;

export type CharacterCreationStepId =
  | "identity"
  | "class"
  | "roots"
  | "roleplay"
  | "review";

export function validateCharacterCreationStep(
  step: CharacterCreationStepId,
  values: CharacterCreationStepValues,
  selectedTraitSlug: string,
) {
  if (step === "identity") {
    if (!values.name.trim()) {
      return "Give the character a name before continuing.";
    }

    const level = Number(values.level.trim());

    if (!Number.isInteger(level) || level < 1 || level > 20) {
      return "Starting level must be a whole number from 1 to 20.";
    }
  }

  if (step === "class" && !values.className.trim()) {
    return "Choose a class before continuing.";
  }

  if (step === "roots" && (!values.ancestry || !values.background)) {
    return "Choose both an ancestry or species and a background before continuing.";
  }

  if (step === "roleplay" && !selectedTraitSlug && !values.summary.trim()) {
    return "Choose a roleplay direction or write a short first impression.";
  }

  return null;
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

function findCatalogOption(
  options: CharacterCreationOption[],
  category: CharacterCreationOptionCategory,
  slug: string,
) {
  return (
    options.find(
      (option) => option.category === category && option.slug === slug,
    ) ?? null
  );
}
