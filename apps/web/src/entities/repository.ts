import type {
  CampaignEntity,
  CampaignEntityBacklinks,
  CampaignEntityMentionReference,
  CampaignEntitySummary,
  CampaignEntityWithBacklinks,
  EntityType,
  Visibility,
} from "@dnd/types";
import { queryDatabase, type DatabaseQueryable } from "@dnd/db";
import type { EntityMutationInput } from "@/entities/manage-entity";
import { replaceWikiLinksWithLabels } from "@/sessions/wiki-links";

type EntityRow = {
  description: string;
  id: string;
  name: string;
  summary: string;
  type: EntityType;
  visibility: Visibility;
};

type EntityBacklinkSessionRow = {
  entity_id: string;
  occurred_at: Date | string;
  session_id: string;
  session_recap: string;
  session_title: string;
  updated_at: Date | string;
};

type EntityMentionReferenceRow = {
  block_id: string | null;
  block_text: string | null;
  entity_id: string;
  label: string | null;
  occurred_at: Date | string;
  session_id: string;
  session_title: string;
};

export async function listEntitiesForUser(userId: string, campaignId: string) {
  return listEntitiesForUserWithClient(defaultDatabaseClient, userId, campaignId);
}

export async function listEntitiesWithBacklinksForUser(
  userId: string,
  campaignId: string,
): Promise<CampaignEntityWithBacklinks[]> {
  const [entities, backlinks] = await Promise.all([
    listEntitiesForUser(userId, campaignId),
    listEntityBacklinksForUser(userId, campaignId),
  ]);
  const backlinksByEntityId = new Map(
    backlinks.map((entityBacklinks) => [
      entityBacklinks.entityId,
      entityBacklinks,
    ]),
  );

  return entities.map((entity) => ({
    ...entity,
    backlinks:
      backlinksByEntityId.get(entity.id) ?? createEmptyEntityBacklinks(entity.id),
  }));
}

async function listEntitiesForUserWithClient(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
) {
  const result = await client.query<EntityRow>(
    `
      select
        entities.id,
        entities.name,
        entities.type,
        entities.summary,
        entities.description,
        entities.visibility
      from entities
      inner join campaign_memberships
        on campaign_memberships.campaign_id = entities.campaign_id
      where campaign_memberships.user_id = $1
        and entities.campaign_id = $2
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      order by entities.updated_at desc, entities.name asc
    `,
    [userId, campaignId],
  );

  return result.rows.map(mapEntityRow);
}

export async function listEntitySummariesForUser(
  userId: string,
  campaignId: string,
  client: DatabaseQueryable = defaultDatabaseClient,
): Promise<CampaignEntitySummary[]> {
  const entities = await listEntitiesForUserWithClient(client, userId, campaignId);

  return entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    summary: entity.summary,
    type: entity.type,
    visibility: entity.visibility,
  }));
}

export async function listEntityBacklinksForUser(
  userId: string,
  campaignId: string,
  client: DatabaseQueryable = defaultDatabaseClient,
): Promise<CampaignEntityBacklinks[]> {
  const linkedSessions = await listEntityBacklinkSessionsForUser(
    client,
    userId,
    campaignId,
  );
  const mentionReferences = await listEntityMentionReferencesForUser(
    client,
    userId,
    campaignId,
  );
  const backlinksByEntityId = new Map<string, CampaignEntityBacklinks>();

  for (const row of linkedSessions) {
    const backlinks = getOrCreateBacklinks(backlinksByEntityId, row.entity_id);

    backlinks.linkedSessions.push({
      id: row.session_id,
      occurredAt: toIsoString(row.occurred_at),
      recap: row.session_recap,
      title: row.session_title,
      updatedAt: toIsoString(row.updated_at),
    });
  }

  for (const row of mentionReferences) {
    const backlinks = getOrCreateBacklinks(backlinksByEntityId, row.entity_id);
    const reference = mapMentionReferenceRow(row);

    backlinks.mentionReferences.push(reference);
  }

  return [...backlinksByEntityId.values()];
}

export async function createEntityForUser(
  userId: string,
  input: EntityMutationInput,
  client: DatabaseQueryable = defaultDatabaseClient,
) {
  const result = await client.query<EntityRow>(
    `
      insert into entities (
        campaign_id,
        type,
        name,
        summary,
        description,
        visibility
      )
      select
        campaign_memberships.campaign_id,
        $3,
        $4,
        $5,
        $6,
        $7
      from campaign_memberships
      where campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = $2
        and (
          campaign_memberships.role = 'dm'
          or $7 = 'player-safe'
        )
      returning id, name, type, summary, description, visibility
    `,
    [
      userId,
      input.campaignId,
      input.type,
      input.name,
      input.summary,
      input.description,
      input.visibility,
    ],
  );

  return requireEntityRow(
    result.rows[0],
    "You do not have access to create this entity.",
  );
}

const defaultDatabaseClient: DatabaseQueryable = {
  query: queryDatabase,
};

export async function updateEntityForUser(
  userId: string,
  entityId: string,
  input: EntityMutationInput,
) {
  const result = await queryDatabase<EntityRow>(
    `
      update entities
      set
        type = $4,
        name = $5,
        summary = $6,
        description = $7,
        visibility = $8,
        updated_at = now()
      from campaign_memberships
      where entities.id = $3
        and entities.campaign_id = $2
        and campaign_memberships.campaign_id = entities.campaign_id
        and campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
        and (
          campaign_memberships.role = 'dm'
          or $8 = 'player-safe'
        )
      returning
        entities.id,
        entities.name,
        entities.type,
        entities.summary,
        entities.description,
        entities.visibility
    `,
    [
      userId,
      input.campaignId,
      entityId,
      input.type,
      input.name,
      input.summary,
      input.description,
      input.visibility,
    ],
  );

  return requireEntityRow(
    result.rows[0],
    "You do not have access to update this entity.",
  );
}

export async function deleteEntityForUser(
  userId: string,
  campaignId: string,
  entityId: string,
) {
  const result = await queryDatabase<Pick<EntityRow, "id">>(
    `
      delete from entities
      using campaign_memberships
      where entities.id = $3
        and entities.campaign_id = $2
        and campaign_memberships.campaign_id = entities.campaign_id
        and campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      returning entities.id
    `,
    [userId, campaignId, entityId],
  );

  if (!result.rows[0]) {
    throw new Error("You do not have access to delete this entity.");
  }
}

async function listEntityBacklinkSessionsForUser(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
) {
  const result = await client.query<EntityBacklinkSessionRow>(
    `
      select distinct
        session_entity_tags.entity_id,
        sessions.id as session_id,
        sessions.title as session_title,
        sessions.recap as session_recap,
        coalesce(sessions.started_at, sessions.created_at) as occurred_at,
        sessions.updated_at
      from session_entity_tags
      inner join sessions
        on sessions.id = session_entity_tags.session_id
        and sessions.campaign_id = $2
      inner join entities
        on entities.id = session_entity_tags.entity_id
        and entities.campaign_id = sessions.campaign_id
      inner join campaign_memberships
        on campaign_memberships.campaign_id = sessions.campaign_id
      where campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      order by
        session_entity_tags.entity_id asc,
        coalesce(sessions.started_at, sessions.created_at) desc,
        sessions.updated_at desc,
        sessions.title asc
    `,
    [userId, campaignId],
  );

  return result.rows;
}

async function listEntityMentionReferencesForUser(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
) {
  const result = await client.query<EntityMentionReferenceRow>(
    `
      select
        entities.id as entity_id,
        sessions.id as session_id,
        sessions.title as session_title,
        coalesce(sessions.started_at, sessions.created_at) as occurred_at,
        note_block.value ->> 'id' as block_id,
        note_block.value ->> 'text' as block_text,
        note_reference.value ->> 'label' as label
      from sessions
      inner join campaign_memberships
        on campaign_memberships.campaign_id = sessions.campaign_id
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(sessions.notes_document -> 'blocks') = 'array'
          then sessions.notes_document -> 'blocks'
          else '[]'::jsonb
        end
      ) as note_block(value)
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(note_block.value -> 'references') = 'array'
          then note_block.value -> 'references'
          else '[]'::jsonb
        end
      ) as note_reference(value)
      inner join entities
        on entities.id::text = note_reference.value ->> 'targetId'
        and entities.campaign_id = sessions.campaign_id
      where campaign_memberships.user_id = $1
        and sessions.campaign_id = $2
        and note_reference.value ->> 'targetType' = 'entity'
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      order by
        entities.id asc,
        coalesce(sessions.started_at, sessions.created_at) desc,
        sessions.updated_at desc,
        sessions.title asc
    `,
    [userId, campaignId],
  );

  return result.rows;
}

function mapEntityRow(row: EntityRow): CampaignEntity {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
    summary: row.summary,
    type: row.type,
    visibility: row.visibility,
  };
}

function requireEntityRow(row: EntityRow | undefined, errorMessage: string) {
  if (!row) {
    throw new Error(errorMessage);
  }

  return mapEntityRow(row);
}

function getOrCreateBacklinks(
  backlinksByEntityId: Map<string, CampaignEntityBacklinks>,
  entityId: string,
) {
  const existingBacklinks = backlinksByEntityId.get(entityId);

  if (existingBacklinks) {
    return existingBacklinks;
  }

  const backlinks = createEmptyEntityBacklinks(entityId);

  backlinksByEntityId.set(entityId, backlinks);

  return backlinks;
}

function createEmptyEntityBacklinks(entityId: string): CampaignEntityBacklinks {
  return {
    entityId,
    linkedSessions: [],
    mentionReferences: [],
  };
}

function mapMentionReferenceRow(
  row: EntityMentionReferenceRow,
): CampaignEntityMentionReference {
  const label = row.label?.trim() || "Entity reference";
  const blockText = row.block_text ?? "";

  return {
    blockId: row.block_id ?? "",
    excerpt: createMentionExcerpt(blockText, label),
    label,
    occurredAt: toIsoString(row.occurred_at),
    sessionId: row.session_id,
    sessionTitle: row.session_title,
  };
}

function createMentionExcerpt(blockText: string, label: string) {
  const text = replaceWikiLinksWithLabels(blockText).replace(/\s+/g, " ").trim();

  if (!text) {
    return label;
  }

  const matchIndex = text.toLowerCase().indexOf(label.toLowerCase());
  const start = matchIndex >= 0 ? Math.max(0, matchIndex - 70) : 0;
  const end =
    matchIndex >= 0
      ? Math.min(text.length, matchIndex + label.length + 150)
      : Math.min(text.length, 220);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
