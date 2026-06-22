import type {
  AbilitySummary,
  CampaignCharacterSummary,
  CampaignCharacterView,
  CampaignRole,
  CharacterLevelProgression,
  Visibility,
} from "@dnd/types";
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseQueryable,
} from "@dnd/db";
import {
  CHARACTER_ABILITY_MAX_COUNT,
  type CharacterMutationInput,
} from "@/characters/manage-character";
import type { CharacterLevelUpInput } from "@/characters/manage-level-up";

type CharacterSummaryRow = {
  ancestry: string | null;
  background: string | null;
  class_name: string | null;
  id: string;
  is_owned_by_current_user: boolean;
  level: number;
  name: string;
  owner_name: string | null;
  progressions: unknown;
  summary: string;
  visibility: Visibility;
};

type CharacterDetailRow = CharacterSummaryRow & {
  abilities: unknown;
  access_level: "full" | "summary";
  backstory: string;
  goals: string;
  inventory_notes: string;
  personal_notes: string;
  relationships: string;
  role: CampaignRole;
  updated_at: string;
};

type CharacterIdRow = {
  id: string;
};

type AbilityCountRow = {
  ability_count: number;
};

export async function listCharacterSummariesForUser(
  userId: string,
  campaignId: string,
  client: DatabaseQueryable = defaultDatabaseClient,
): Promise<CampaignCharacterSummary[]> {
  const result = await client.query<CharacterSummaryRow>(
    `
      select
        characters.id,
        characters.name,
        characters.summary,
        characters.class_name,
        characters.level,
        characters.ancestry,
        characters.background,
        characters.visibility,
        users.name as owner_name,
        characters.owner_user_id = $1 as is_owned_by_current_user,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'characterId', character_level_progressions.character_id,
                  'createdAt', to_char(
                    character_level_progressions.created_at at time zone 'UTC',
                    'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
                  ),
                  'createdByName', progression_users.name,
                  'features', character_level_progressions.added_abilities,
                  'fromLevel', character_level_progressions.from_level,
                  'id', character_level_progressions.id,
                  'summary', character_level_progressions.summary,
                  'toLevel', character_level_progressions.to_level
                )
                order by character_level_progressions.to_level desc
              )
              from character_level_progressions
              left join users progression_users
                on progression_users.id =
                  character_level_progressions.created_by_user_id
              where character_level_progressions.character_id = characters.id
            ),
            '[]'::jsonb
          )
          else '[]'::jsonb
        end as progressions
      from characters
      inner join campaign_memberships
        on campaign_memberships.campaign_id = characters.campaign_id
      left join users on users.id = characters.owner_user_id
      where campaign_memberships.user_id = $1
        and characters.campaign_id = $2
        and (
          campaign_memberships.role = 'dm'
          or characters.owner_user_id = $1
          or characters.visibility = 'player-safe'
        )
      order by
        characters.owner_user_id = $1 desc,
        characters.updated_at desc,
        characters.name asc
    `,
    [userId, campaignId],
  );

  return result.rows.map(mapCharacterSummaryRow);
}

export async function getCharacterForUser(
  userId: string,
  campaignId: string,
  characterId: string,
  client: DatabaseQueryable = defaultDatabaseClient,
): Promise<CampaignCharacterView | null> {
  const result = await client.query<CharacterDetailRow>(
    `
      select
        characters.id,
        characters.name,
        characters.summary,
        characters.class_name,
        characters.level,
        characters.ancestry,
        characters.background,
        characters.visibility,
        to_char(
          characters.updated_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) as updated_at,
        users.name as owner_name,
        campaign_memberships.role,
        characters.owner_user_id = $1 as is_owned_by_current_user,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then 'full'
          else 'summary'
        end as access_level,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then characters.backstory
          else ''
        end as backstory,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then characters.goals
          else ''
        end as goals,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then characters.relationships
          else ''
        end as relationships,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then characters.inventory_notes
          else ''
        end as inventory_notes,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then characters.personal_notes
          else ''
        end as personal_notes,
        case
          when campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          then coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'characterId', character_level_progressions.character_id,
                  'createdAt', to_char(
                    character_level_progressions.created_at at time zone 'UTC',
                    'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
                  ),
                  'createdByName', progression_users.name,
                  'features', character_level_progressions.added_abilities,
                  'fromLevel', character_level_progressions.from_level,
                  'id', character_level_progressions.id,
                  'summary', character_level_progressions.summary,
                  'toLevel', character_level_progressions.to_level
                )
                order by character_level_progressions.to_level desc
              )
              from character_level_progressions
              left join users progression_users
                on progression_users.id =
                  character_level_progressions.created_by_user_id
              where character_level_progressions.character_id = characters.id
            ),
            '[]'::jsonb
          )
          else '[]'::jsonb
        end as progressions,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'characterId', ability_summaries.character_id,
              'id', ability_summaries.id,
              'name', ability_summaries.name,
              'summary', ability_summaries.summary,
              'trigger', ability_summaries.trigger,
              'visibility', ability_summaries.visibility
            )
            order by ability_summaries.created_at asc, ability_summaries.name asc
          ) filter (where ability_summaries.id is not null),
          '[]'::jsonb
        ) as abilities
      from characters
      inner join campaign_memberships
        on campaign_memberships.campaign_id = characters.campaign_id
      left join users on users.id = characters.owner_user_id
      left join ability_summaries
        on ability_summaries.character_id = characters.id
        and (
          campaign_memberships.role = 'dm'
          or characters.owner_user_id = $1
        )
      where campaign_memberships.user_id = $1
        and characters.campaign_id = $2
        and characters.id = $3
        and (
          campaign_memberships.role = 'dm'
          or characters.owner_user_id = $1
          or characters.visibility = 'player-safe'
        )
      group by
        characters.id,
        users.name,
        campaign_memberships.role
      limit 1
    `,
    [userId, campaignId, characterId],
  );

  return result.rows[0] ? mapCharacterDetailRow(result.rows[0]) : null;
}

export async function createCharacterForUser(
  userId: string,
  input: CharacterMutationInput,
) {
  return withDatabaseTransaction((client) =>
    createCharacterInTransaction(client, userId, input),
  );
}

export async function updateCharacterForUser(
  userId: string,
  characterId: string,
  input: CharacterMutationInput,
  expectedRevision: string,
) {
  return withDatabaseTransaction((client) =>
    updateCharacterWithClient(
      client,
      userId,
      characterId,
      input,
      expectedRevision,
    ),
  );
}

export async function completeCharacterLevelUpForUser(
  userId: string,
  input: CharacterLevelUpInput,
) {
  return withDatabaseTransaction((client) =>
    completeCharacterLevelUpWithClient(client, userId, input),
  );
}

export async function createCharacterInTransaction(
  client: DatabaseQueryable,
  userId: string,
  input: CharacterMutationInput,
) {
  await ensureCharacterNameAvailable(
    client,
    userId,
    input.campaignId,
    input.name,
  );

  const result = await client.query<CharacterIdRow>(
    `
      insert into characters (
        campaign_id,
        owner_user_id,
        name,
        summary,
        class_name,
        level,
        ancestry,
        background,
        backstory,
        goals,
        relationships,
        inventory_notes,
        personal_notes,
        visibility
      )
      select
        campaign_memberships.campaign_id,
        campaign_memberships.user_id,
        $3::text,
        $4::text,
        $5::text,
        $6::integer,
        $7::text,
        $8::text,
        $9::text,
        $10::text,
        $11::text,
        $12::text,
        $13::text,
        $14::visibility
      from campaign_memberships
      where campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = $2
        and (
          campaign_memberships.role = 'dm'
          or $14::visibility = 'player-safe'::visibility
        )
      returning id
    `,
    characterValues(userId, input),
  );
  const characterId = requireCharacterId(
    result.rows[0],
    "You do not have access to create this character.",
  );

  await replaceAbilitySummaries(client, characterId, input);

  return requireFullCharacter(
    await getCharacterForUser(userId, input.campaignId, characterId, client),
    "The created character could not be loaded.",
  );
}

async function updateCharacterWithClient(
  client: DatabaseQueryable,
  userId: string,
  characterId: string,
  input: CharacterMutationInput,
  expectedRevision: string,
) {
  await ensureCharacterNameAvailable(
    client,
    userId,
    input.campaignId,
    input.name,
    characterId,
  );

  const result = await client.query<CharacterIdRow>(
    `
      update characters
      set
        name = $4,
        summary = $5,
        class_name = $6,
        level = $7,
        ancestry = $8,
        background = $9,
        backstory = $10,
        goals = $11,
        relationships = $12,
        inventory_notes = $13,
        personal_notes = $14,
        visibility = case
          when campaign_memberships.role = 'dm' then $15
          else characters.visibility
        end,
        updated_at = now()
      from campaign_memberships
      where characters.id = $3
        and characters.campaign_id = $2
        and campaign_memberships.campaign_id = characters.campaign_id
        and campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or characters.owner_user_id = $1
        )
        and characters.level = $7
        and characters.updated_at = $16::timestamptz
      returning characters.id
    `,
    [
      userId,
      input.campaignId,
      characterId,
      ...characterValues(userId, input).slice(2),
      expectedRevision,
    ],
  );
  const savedCharacterId = requireCharacterId(
    result.rows[0],
    "This character changed after you opened it, or you no longer have edit access. Reload before saving again.",
  );

  await replaceAbilitySummaries(client, savedCharacterId, input);

  return requireFullCharacter(
    await getCharacterForUser(
      userId,
      input.campaignId,
      savedCharacterId,
      client,
    ),
    "The updated character could not be loaded.",
  );
}

async function completeCharacterLevelUpWithClient(
  client: DatabaseQueryable,
  userId: string,
  input: CharacterLevelUpInput,
) {
  const result = await client.query<CharacterIdRow>(
    `
      update characters
      set
        level = $4,
        updated_at = now()
      from campaign_memberships
      where characters.id = $3
        and characters.campaign_id = $2
        and campaign_memberships.campaign_id = characters.campaign_id
        and campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or characters.owner_user_id = $1
        )
        and characters.level = $5
        and $4 = characters.level + 1
        and characters.level < 20
        and characters.updated_at = $6::timestamptz
      returning characters.id
    `,
    [
      userId,
      input.campaignId,
      input.characterId,
      input.targetLevel,
      input.currentLevel,
      input.expectedRevision,
    ],
  );
  const characterId = requireCharacterId(
    result.rows[0],
    "This character changed after you opened the level-up flow, is already level 20, or you no longer have edit access. Reload and try again.",
  );
  const abilityCountResult = await client.query<AbilityCountRow>(
    `
      select count(*)::integer as ability_count
      from ability_summaries
      where character_id = $1
    `,
    [characterId],
  );
  const currentAbilityCount =
    abilityCountResult.rows[0]?.ability_count ?? 0;

  if (
    currentAbilityCount + input.abilities.length >
    CHARACTER_ABILITY_MAX_COUNT
  ) {
    throw new Error(
      `This character can keep up to ${CHARACTER_ABILITY_MAX_COUNT} ability reminders. Remove an existing reminder before completing this level-up.`,
    );
  }

  await client.query(
    `
      insert into character_level_progressions (
        character_id,
        created_by_user_id,
        from_level,
        to_level,
        summary,
        added_abilities
      )
      values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      characterId,
      userId,
      input.currentLevel,
      input.targetLevel,
      input.summary,
      JSON.stringify(input.abilities),
    ],
  );

  for (const ability of input.abilities) {
    await client.query(
      `
        insert into ability_summaries (
          character_id,
          name,
          summary,
          trigger,
          visibility
        )
        values ($1, $2, $3, $4, 'player-safe')
      `,
      [characterId, ability.name, ability.summary, ability.trigger],
    );
  }

  return requireFullCharacter(
    await getCharacterForUser(
      userId,
      input.campaignId,
      characterId,
      client,
    ),
    "The levelled character could not be loaded.",
  );
}

async function replaceAbilitySummaries(
  client: DatabaseQueryable,
  characterId: string,
  input: CharacterMutationInput,
) {
  await client.query(
    "delete from ability_summaries where character_id = $1",
    [characterId],
  );

  for (const ability of input.abilities) {
    await client.query(
      `
        insert into ability_summaries (
          character_id,
          name,
          summary,
          trigger,
          visibility
        )
        values ($1, $2, $3, $4, 'player-safe')
      `,
      [characterId, ability.name, ability.summary, ability.trigger],
    );
  }
}

async function ensureCharacterNameAvailable(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
  name: string,
  excludedCharacterId: string | null = null,
) {
  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1::text, 0))",
    [campaignId],
  );

  const result = await client.query<CharacterIdRow>(
    `
      select characters.id
      from campaign_memberships
      inner join characters
        on characters.campaign_id = campaign_memberships.campaign_id
      where campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = $2
        and lower(
          regexp_replace(btrim(characters.name), '[[:space:]]+', ' ', 'g')
        ) = lower(
          regexp_replace(btrim($3), '[[:space:]]+', ' ', 'g')
        )
        and ($4::uuid is null or characters.id <> $4)
      limit 1
    `,
    [userId, campaignId, name, excludedCharacterId],
  );

  if (result.rows[0]) {
    throw new Error(
      `A character named "${name}" already exists in this campaign.`,
    );
  }
}

function characterValues(userId: string, input: CharacterMutationInput) {
  return [
    userId,
    input.campaignId,
    input.name,
    input.summary,
    input.className,
    input.level,
    input.ancestry,
    input.background,
    input.backstory,
    input.goals,
    input.relationships,
    input.inventoryNotes,
    input.personalNotes,
    input.visibility,
  ] as const;
}

const defaultDatabaseClient: DatabaseQueryable = {
  query: queryDatabase,
};

function mapCharacterSummaryRow(
  row: CharacterSummaryRow,
): CampaignCharacterSummary {
  return {
    ancestry: row.ancestry,
    background: row.background,
    className: row.class_name,
    id: row.id,
    isOwnedByCurrentUser: row.is_owned_by_current_user,
    level: row.level,
    name: row.name,
    ownerName: row.owner_name,
    progressions: mapProgressions(row.progressions),
    summary: row.summary,
    visibility: row.visibility,
  };
}

function mapProgressions(value: unknown): CharacterLevelProgression[] {
  const progressions = typeof value === "string" ? parseJson(value) : value;

  if (!Array.isArray(progressions)) {
    return [];
  }

  return progressions.flatMap(
    (progression): CharacterLevelProgression[] =>
      isCharacterLevelProgression(progression) ? [progression] : [],
  );
}

function mapCharacterDetailRow(row: CharacterDetailRow): CampaignCharacterView {
  const summary = mapCharacterSummaryRow(row);

  if (row.access_level === "summary") {
    return {
      ...summary,
      accessLevel: "summary",
      canEdit: false,
    };
  }

  return {
    ...summary,
    abilities: mapAbilities(row.abilities),
    accessLevel: "full",
    backstory: row.backstory,
    canEdit: row.role === "dm" || row.is_owned_by_current_user,
    goals: row.goals,
    inventoryNotes: row.inventory_notes,
    personalNotes: row.personal_notes,
    relationships: row.relationships,
    updatedAt: row.updated_at,
  };
}

function mapAbilities(value: unknown): AbilitySummary[] {
  const abilities = typeof value === "string" ? parseJson(value) : value;

  if (!Array.isArray(abilities)) {
    return [];
  }

  return abilities.flatMap((ability): AbilitySummary[] => {
    if (!isAbilitySummary(ability)) {
      return [];
    }

    return [ability];
  });
}

function isAbilitySummary(value: unknown): value is AbilitySummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ability = value as Record<string, unknown>;

  return (
    typeof ability.characterId === "string" &&
    typeof ability.id === "string" &&
    typeof ability.name === "string" &&
    typeof ability.summary === "string" &&
    (typeof ability.trigger === "string" || ability.trigger === null) &&
    (ability.visibility === "dm-only" || ability.visibility === "player-safe")
  );
}

function isCharacterLevelProgression(
  value: unknown,
): value is CharacterLevelProgression {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progression = value as Record<string, unknown>;

  return (
    typeof progression.characterId === "string" &&
    typeof progression.createdAt === "string" &&
    (typeof progression.createdByName === "string" ||
      progression.createdByName === null) &&
    Array.isArray(progression.features) &&
    progression.features.every(isLevelUpFeature) &&
    typeof progression.fromLevel === "number" &&
    typeof progression.id === "string" &&
    typeof progression.summary === "string" &&
    typeof progression.toLevel === "number"
  );
}

function isLevelUpFeature(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const feature = value as Record<string, unknown>;

  return (
    typeof feature.name === "string" &&
    typeof feature.summary === "string" &&
    (typeof feature.trigger === "string" || feature.trigger === null)
  );
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

function requireCharacterId(
  row: CharacterIdRow | undefined,
  errorMessage: string,
) {
  if (!row) {
    throw new Error(errorMessage);
  }

  return row.id;
}

function requireFullCharacter(
  character: CampaignCharacterView | null,
  errorMessage: string,
) {
  if (!character || character.accessLevel !== "full") {
    throw new Error(errorMessage);
  }

  return character;
}
