import { coreCharacterCreationOptions } from "@dnd/db/character-creation-content";
import { queryDatabase, type DatabaseQueryable } from "@dnd/db";
import type {
  CharacterCreationOption,
  CharacterCreationOptionCategory,
} from "@dnd/types";
import { hasCompleteCharacterCreationCatalog } from "@/characters/creation-profile";

type CharacterCreationOptionRow = {
  ability_summaries: unknown;
  actions: unknown;
  category: CharacterCreationOptionCategory;
  flavour: string;
  gameplay: string;
  id: string;
  magic_capable: boolean;
  name: string;
  proficiencies: unknown;
  quirks: unknown;
  slug: string;
  source: string;
  source_version: string;
  summary: string;
  traits: unknown;
};

export async function listCharacterCreationOptionsForUser(
  userId: string,
  campaignId: string,
  client: DatabaseQueryable = defaultDatabaseClient,
): Promise<CharacterCreationOption[]> {
  const result = await client.query<CharacterCreationOptionRow>(
    `
      select
        character_creation_options.id,
        character_creation_options.slug,
        character_creation_options.category,
        character_creation_options.name,
        character_creation_options.summary,
        character_creation_options.gameplay,
        character_creation_options.flavour,
        character_creation_options.actions,
        character_creation_options.traits,
        character_creation_options.proficiencies,
        character_creation_options.quirks,
        character_creation_options.ability_summaries,
        character_creation_options.magic_capable,
        character_creation_options.source,
        character_creation_options.source_version
      from character_creation_options
      inner join campaign_memberships
        on campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = $2
      order by
        case character_creation_options.category
          when 'class' then 1
          when 'ancestry' then 2
          when 'background' then 3
          else 4
        end,
        character_creation_options.display_order asc,
        character_creation_options.name asc
    `,
    [userId, campaignId],
  );

  return result.rows.map(mapCharacterCreationOptionRow);
}

export async function loadCharacterCreationCatalogForUser(
  userId: string,
  campaignId: string,
) {
  try {
    const storedOptions = await listCharacterCreationOptionsForUser(
      userId,
      campaignId,
    );

    if (hasCompleteCharacterCreationCatalog(storedOptions)) {
      return {
        loadNotice: null,
        options: storedOptions,
      };
    }

    return {
      loadNotice:
        "The saved choice library is incomplete, so this flow is using the bundled MVP choices.",
      options: coreCharacterCreationOptions,
    };
  } catch {
    return {
      loadNotice:
        "The saved choice library could not be refreshed, so this flow is using the bundled MVP choices.",
      options: coreCharacterCreationOptions,
    };
  }
}

const defaultDatabaseClient: DatabaseQueryable = {
  query: queryDatabase,
};

function mapCharacterCreationOptionRow(
  row: CharacterCreationOptionRow,
): CharacterCreationOption {
  return {
    abilities: mapAbilities(row.ability_summaries),
    actions: mapTextArray(row.actions),
    category: row.category,
    flavour: row.flavour,
    gameplay: row.gameplay,
    id: row.id,
    magicCapable: row.magic_capable,
    name: row.name,
    proficiencies: mapTextArray(row.proficiencies),
    quirks: mapTextArray(row.quirks),
    slug: row.slug,
    source: row.source,
    sourceVersion: row.source_version,
    summary: row.summary,
    traits: mapTextArray(row.traits),
  };
}

function mapTextArray(value: unknown): string[] {
  const parsed = parseJsonValue(value);

  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

function mapAbilities(
  value: unknown,
): CharacterCreationOption["abilities"] {
  const parsed = parseJsonValue(value);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap(
    (item): CharacterCreationOption["abilities"] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const ability = item as Record<string, unknown>;

    if (
      typeof ability.name !== "string" ||
      typeof ability.summary !== "string" ||
      (ability.trigger !== undefined &&
        ability.trigger !== null &&
        typeof ability.trigger !== "string")
    ) {
      return [];
    }

      return [
        {
          name: ability.name,
          summary: ability.summary,
          trigger:
            typeof ability.trigger === "string" ? ability.trigger : null,
        },
      ];
    },
  );
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}
