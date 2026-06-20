import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseQueryable,
} from "@dnd/db";
import type {
  CharacterSpell,
  CharacterSpellbook,
  CharacterSpellSlot,
  SpellDefinition,
  SpellPreparationState,
  Visibility,
} from "@dnd/types";

type AuthorizedCharacterRow = {
  character_id: string;
  character_name: string;
  class_name: string | null;
  is_magic_capable: boolean;
};

type SpellRow = {
  campaign_id: string | null;
  casting_time: string;
  class_names: unknown;
  concentration: boolean;
  duration: string;
  id: string;
  name: string;
  preparation_state: SpellPreparationState | null;
  range_text: string;
  ritual: boolean;
  school: string;
  slug: string;
  source: string;
  source_version: string;
  spell_level: number;
  summary: string;
  visibility: Visibility;
};

type SpellSlotRow = {
  spell_level: number;
  total_slots: number;
  used_slots: number;
};

type IdRow = {
  id: string;
};

type SpellSelectionRow = IdRow & {
  slug: string;
};

export async function getCharacterSpellbookForUser(
  userId: string,
  campaignId: string,
  characterId: string,
  client: DatabaseQueryable = defaultDatabaseClient,
): Promise<CharacterSpellbook | null> {
  const character = await getAuthorizedSpellbookCharacter(
    client,
    userId,
    campaignId,
    characterId,
  );

  if (!character) {
    return null;
  }

  if (!character.is_magic_capable) {
    return {
      availableSpells: [],
      canManage: true,
      characterId: character.character_id,
      characterName: character.character_name,
      className: character.class_name,
      isMagicCapable: false,
      slots: [],
      spells: [],
    };
  }

  const [spellsResult, slotsResult] = await Promise.all([
    client.query<SpellRow>(
      `
        with visible_spells as (
          select spell_definitions.*
          from spell_definitions
          inner join campaign_memberships
            on campaign_memberships.user_id = $1
            and campaign_memberships.campaign_id = $2
          inner join characters
            on characters.id = $3
            and characters.campaign_id = campaign_memberships.campaign_id
          where (
              campaign_memberships.role = 'dm'
              or characters.owner_user_id = $1
            )
            and (
              campaign_memberships.role = 'dm'
              or spell_definitions.visibility = 'player-safe'
            )
            and (
              spell_definitions.campaign_id = $2
              or spell_definitions.campaign_id is null
            )
            and lower(coalesce(characters.class_name, '')) = any(
              spell_definitions.class_names
            )
        ),
        effective_spells as (
          select distinct on (visible_spells.slug)
            visible_spells.*
          from visible_spells
          order by
            visible_spells.slug,
            case when visible_spells.campaign_id = $2 then 0 else 1 end
        )
        select
          effective_spells.id,
          effective_spells.campaign_id,
          effective_spells.slug,
          effective_spells.name,
          effective_spells.spell_level,
          effective_spells.school,
          effective_spells.casting_time,
          effective_spells.range_text,
          effective_spells.duration,
          effective_spells.concentration,
          effective_spells.ritual,
          effective_spells.summary,
          effective_spells.class_names,
          effective_spells.visibility,
          effective_spells.source,
          effective_spells.source_version,
          character_spells.preparation_state
        from effective_spells
        left join character_spells
          on character_spells.character_id = $3
          and character_spells.spell_slug = effective_spells.slug
        order by
          effective_spells.spell_level,
          effective_spells.display_order,
          effective_spells.name
      `,
      [userId, campaignId, characterId],
    ),
    client.query<SpellSlotRow>(
      `
        select
          character_spell_slots.spell_level,
          character_spell_slots.total_slots,
          character_spell_slots.used_slots
        from character_spell_slots
        inner join characters
          on characters.id = character_spell_slots.character_id
        inner join campaign_memberships
          on campaign_memberships.campaign_id = characters.campaign_id
        where campaign_memberships.user_id = $1
          and characters.campaign_id = $2
          and characters.id = $3
          and (
            campaign_memberships.role = 'dm'
            or characters.owner_user_id = $1
          )
        order by character_spell_slots.spell_level
      `,
      [userId, campaignId, characterId],
    ),
  ]);

  const availableSpells = spellsResult.rows.map(mapSpellDefinition);

  return {
    availableSpells,
    canManage: true,
    characterId: character.character_id,
    characterName: character.character_name,
    className: character.class_name,
    isMagicCapable: true,
    slots: slotsResult.rows.map(mapSpellSlot),
    spells: spellsResult.rows.flatMap((row): CharacterSpell[] => {
      if (!row.preparation_state) {
        return [];
      }

      return [
        {
          ...mapSpellDefinition(row),
          preparation: row.preparation_state,
        },
      ];
    }),
  };
}

export async function setCharacterSpellForUser(
  userId: string,
  campaignId: string,
  characterId: string,
  spellId: string,
  preparation: SpellPreparationState,
) {
  return withDatabaseTransaction(async (client) => {
    await requireMagicCharacter(client, userId, campaignId, characterId);
    const spell = await requireAvailableSpell(
      client,
      userId,
      campaignId,
      characterId,
      spellId,
    );

    await client.query(
      `
        insert into character_spells (
          character_id,
          spell_slug,
          preparation_state
        )
        values ($1, $2, $3)
        on conflict (character_id, spell_slug) do update
        set
          preparation_state = excluded.preparation_state,
          updated_at = now()
      `,
      [characterId, spell.slug, preparation],
    );
  });
}

export async function removeCharacterSpellForUser(
  userId: string,
  campaignId: string,
  characterId: string,
  spellId: string,
) {
  return withDatabaseTransaction(async (client) => {
    await requireMagicCharacter(client, userId, campaignId, characterId);
    const spell = await requireAvailableSpell(
      client,
      userId,
      campaignId,
      characterId,
      spellId,
    );
    await client.query(
      `
        delete from character_spells
        where character_spells.character_id = $1
          and character_spells.spell_slug = $2
      `,
      [characterId, spell.slug],
    );
  });
}

export async function configureCharacterSpellSlotsForUser(
  userId: string,
  campaignId: string,
  characterId: string,
  spellLevel: number,
  totalSlots: number,
) {
  return withDatabaseTransaction(async (client) => {
    await requireMagicCharacter(client, userId, campaignId, characterId);

    if (totalSlots === 0) {
      await client.query(
        `
          delete from character_spell_slots
          where character_id = $1
            and spell_level = $2
        `,
        [characterId, spellLevel],
      );
      return;
    }

    await client.query(
      `
        insert into character_spell_slots (
          character_id,
          spell_level,
          total_slots,
          used_slots
        )
        values ($1, $2, $3, 0)
        on conflict (character_id, spell_level) do update
        set
          total_slots = excluded.total_slots,
          used_slots = least(
            character_spell_slots.used_slots,
            excluded.total_slots
          ),
          updated_at = now()
      `,
      [characterId, spellLevel, totalSlots],
    );
  });
}

export async function adjustCharacterSpellSlotsForUser(
  userId: string,
  campaignId: string,
  characterId: string,
  spellLevel: number,
  adjustment: -1 | 1,
) {
  return withDatabaseTransaction(async (client) => {
    await requireMagicCharacter(client, userId, campaignId, characterId);

    const result = await client.query<IdRow>(
      `
        update character_spell_slots
        set
          used_slots = used_slots + $3,
          updated_at = now()
        where character_id = $1
          and spell_level = $2
          and used_slots + $3 between 0 and total_slots
        returning id
      `,
      [characterId, spellLevel, adjustment],
    );

    if (!result.rows[0]) {
      throw new Error(
        adjustment > 0
          ? `No level ${spellLevel} spell slots remain.`
          : `All level ${spellLevel} spell slots are already restored.`,
      );
    }
  });
}

async function getAuthorizedSpellbookCharacter(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
  characterId: string,
) {
  const result = await client.query<AuthorizedCharacterRow>(
    `
      select
        characters.id as character_id,
        characters.name as character_name,
        characters.class_name,
        (
          exists (
            select 1
            from ability_summaries
            where ability_summaries.character_id = characters.id
              and lower(ability_summaries.name) = 'spellcasting'
          )
          or exists (
            select 1
            from character_creation_options
            where character_creation_options.category = 'class'
              and character_creation_options.magic_capable = true
              and lower(character_creation_options.name) = lower(
                coalesce(characters.class_name, '')
              )
          )
        ) as is_magic_capable
      from characters
      inner join campaign_memberships
        on campaign_memberships.campaign_id = characters.campaign_id
      where campaign_memberships.user_id = $1
        and characters.campaign_id = $2
        and characters.id = $3
        and (
          campaign_memberships.role = 'dm'
          or characters.owner_user_id = $1
        )
      limit 1
    `,
    [userId, campaignId, characterId],
  );

  return result.rows[0] ?? null;
}

async function requireMagicCharacter(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
  characterId: string,
) {
  const character = await getAuthorizedSpellbookCharacter(
    client,
    userId,
    campaignId,
    characterId,
  );

  if (!character) {
    throw new Error("Character spellbook access is required.");
  }

  if (!character.is_magic_capable) {
    throw new Error(
      "This character does not have a spellcasting profile yet.",
    );
  }

  return character;
}

async function requireAvailableSpell(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
  characterId: string,
  spellId: string,
) {
  const result = await client.query<SpellSelectionRow>(
    `
      select
        spell_definitions.id,
        spell_definitions.slug
      from spell_definitions
      inner join characters
        on characters.id = $3
        and characters.campaign_id = $2
      inner join campaign_memberships
        on campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = characters.campaign_id
      where spell_definitions.id = $4
        and (
          campaign_memberships.role = 'dm'
          or characters.owner_user_id = $1
        )
        and (
          campaign_memberships.role = 'dm'
          or spell_definitions.visibility = 'player-safe'
        )
        and (
          spell_definitions.campaign_id = $2
          or spell_definitions.campaign_id is null
        )
        and lower(coalesce(characters.class_name, '')) = any(
          spell_definitions.class_names
        )
      limit 1
    `,
    [userId, campaignId, characterId, spellId],
  );

  if (!result.rows[0]) {
    throw new Error("Choose a spell available to this character.");
  }

  return result.rows[0];
}

function mapSpellDefinition(row: SpellRow): SpellDefinition {
  return {
    campaignId: row.campaign_id,
    castingTime: row.casting_time,
    classNames: mapTextArray(row.class_names),
    concentration: row.concentration,
    duration: row.duration,
    id: row.id,
    level: row.spell_level,
    name: row.name,
    range: row.range_text,
    ritual: row.ritual,
    school: row.school,
    slug: row.slug,
    source: row.source,
    sourceVersion: row.source_version,
    summary: row.summary,
    visibility: row.visibility,
  };
}

function mapSpellSlot(row: SpellSlotRow): CharacterSpellSlot {
  return {
    level: row.spell_level,
    total: row.total_slots,
    used: row.used_slots,
  };
}

function mapTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .replace(/^{|}$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

const defaultDatabaseClient: DatabaseQueryable = {
  query: queryDatabase,
};
