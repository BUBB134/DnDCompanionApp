import {
  spellPreparationStates,
  type SpellPreparationState,
} from "@dnd/types";

export type SpellbookActionState = {
  formError: string | null;
  successMessage: string | null;
};

export const initialSpellbookActionState: SpellbookActionState = {
  formError: null,
  successMessage: null,
};

export function parseSpellPreparationState(
  value: string,
): SpellPreparationState | null {
  return spellPreparationStates.includes(value as SpellPreparationState)
    ? (value as SpellPreparationState)
    : null;
}

export function parseSpellLevel(value: string) {
  return parseBoundedInteger(value, 1, 9);
}

export function parseTotalSpellSlots(value: string) {
  return parseBoundedInteger(value, 0, 9);
}

function parseBoundedInteger(value: string, minimum: number, maximum: number) {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return parsedValue >= minimum && parsedValue <= maximum
    ? parsedValue
    : null;
}
