import type {
  CampaignEntitySummary,
  CampaignSession,
  EntityType,
  SessionSummary,
  Visibility,
} from "@dnd/types";
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseQueryable,
} from "@dnd/db";
import type { SessionMutationInput } from "@/sessions/manage-session";
import { normalizeSessionNoteDocument } from "@/sessions/note-document";

type SessionRow = {
  created_at: Date | string;
  id: string;
  notes: string;
  notes_document: unknown;
  recap: string;
  tagged_entities: unknown;
  title: string;
  unresolved_hooks: unknown;
  updated_at: Date | string;
};

export async function listSessionsForUser(
  userId: string,
  campaignId: string,
) {
  const result = await queryDatabase<SessionRow>(
    createSessionsQuery(),
    [userId, campaignId],
  );

  return result.rows.map(mapSessionRow);
}

export async function getLatestSessionForUser(
  userId: string,
  campaignId: string,
): Promise<CampaignSession | null> {
  const result = await queryDatabase<SessionRow>(
    `${createSessionsQuery()}
      limit 1
    `,
    [userId, campaignId],
  );

  return result.rows[0] ? mapSessionRow(result.rows[0]) : null;
}

export async function createSessionForUser(
  userId: string,
  input: SessionMutationInput,
) {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<Pick<SessionRow, "id">>(
      `
        insert into sessions (
          campaign_id,
          title,
          notes,
          notes_document,
          unresolved_hooks
        )
        select
          campaign_memberships.campaign_id,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb
        from campaign_memberships
        where campaign_memberships.user_id = $1
          and campaign_memberships.campaign_id = $2
        returning id
      `,
      [
        userId,
        input.campaignId,
        input.title,
        input.notes,
        JSON.stringify(input.notesDocument),
        JSON.stringify(input.unresolvedHooks),
      ],
    );
    const sessionId = requireSessionId(
      result.rows[0],
      "You do not have access to create sessions for this campaign.",
    );

    await replaceSessionEntityTagsForUser(
      client,
      userId,
      input.campaignId,
      sessionId,
      input.taggedEntityIds,
    );

    return getSessionForUser(
      client,
      userId,
      input.campaignId,
      sessionId,
      "You do not have access to create sessions for this campaign.",
    );
  });
}

export async function updateSessionForUser(
  userId: string,
  sessionId: string,
  input: SessionMutationInput,
) {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<Pick<SessionRow, "id">>(
      `
        update sessions
        set
          title = $4,
          notes = $5,
          notes_document = $6::jsonb,
          unresolved_hooks = $7::jsonb,
          updated_at = now()
        from campaign_memberships
        where sessions.id = $3
          and sessions.campaign_id = $2
          and campaign_memberships.campaign_id = sessions.campaign_id
          and campaign_memberships.user_id = $1
        returning sessions.id
      `,
      [
        userId,
        input.campaignId,
        sessionId,
        input.title,
        input.notes,
        JSON.stringify(input.notesDocument),
        JSON.stringify(input.unresolvedHooks),
      ],
    );
    const savedSessionId = requireSessionId(
      result.rows[0],
      "You do not have access to update this session.",
    );

    await replaceSessionEntityTagsForUser(
      client,
      userId,
      input.campaignId,
      savedSessionId,
      input.taggedEntityIds,
    );

    return getSessionForUser(
      client,
      userId,
      input.campaignId,
      savedSessionId,
      "You do not have access to update this session.",
    );
  });
}

async function getSessionForUser(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
  sessionId: string,
  errorMessage: string,
) {
  const result = await client.query<SessionRow>(
    `${createSessionsQuery("and sessions.id = $3")}
      limit 1
    `,
    [userId, campaignId, sessionId],
  );

  return requireSessionRow(result.rows[0], errorMessage);
}

async function replaceSessionEntityTagsForUser(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
  sessionId: string,
  entityIds: readonly string[],
) {
  const uniqueEntityIds = [...new Set(entityIds)];

  await client.query(
    `
      delete from session_entity_tags
      using entities, campaign_memberships
      where session_entity_tags.session_id = $3
        and entities.id = session_entity_tags.entity_id
        and entities.campaign_id = $2
        and campaign_memberships.campaign_id = entities.campaign_id
        and campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
    `,
    [userId, campaignId, sessionId],
  );

  if (uniqueEntityIds.length === 0) {
    return;
  }

  const result = await client.query<{ entity_id: string }>(
    `
      insert into session_entity_tags (session_id, entity_id)
      select
        $3,
        entities.id
      from entities
      inner join campaign_memberships
        on campaign_memberships.campaign_id = entities.campaign_id
      where campaign_memberships.user_id = $1
        and entities.campaign_id = $2
        and entities.id = any($4::uuid[])
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      on conflict do nothing
      returning entity_id
    `,
    [userId, campaignId, sessionId, uniqueEntityIds],
  );

  if (result.rowCount !== uniqueEntityIds.length) {
    throw new Error("Choose only entities you can access for this session.");
  }
}

function mapSessionRow(row: SessionRow): CampaignSession {
  return {
    ...mapSessionSummaryRow(row),
    createdAt: toIsoString(row.created_at),
    notes: row.notes,
    notesDocument: normalizeSessionNoteDocument(row.notes_document, row.notes),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapSessionSummaryRow(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    recap: row.recap || createNotesPreview(row.notes),
    taggedEntities: mapTaggedEntities(row.tagged_entities),
    title: row.title,
    unresolvedHooks: mapUnresolvedHooks(row.unresolved_hooks),
  };
}

function createSessionsQuery(extraWhereClause = "") {
  return `
      select
        sessions.id,
        sessions.title,
        sessions.recap,
        sessions.notes,
        sessions.notes_document,
        sessions.unresolved_hooks,
        sessions.created_at,
        sessions.updated_at,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', entities.id,
              'name', entities.name,
              'summary', entities.summary,
              'type', entities.type,
              'visibility', entities.visibility
            )
            order by entities.name asc
          ) filter (where entities.id is not null),
          '[]'::jsonb
        ) as tagged_entities
      from sessions
      inner join campaign_memberships
        on campaign_memberships.campaign_id = sessions.campaign_id
      left join session_entity_tags
        on session_entity_tags.session_id = sessions.id
      left join entities
        on entities.id = session_entity_tags.entity_id
        and entities.campaign_id = sessions.campaign_id
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      where campaign_memberships.user_id = $1
        and sessions.campaign_id = $2
        ${extraWhereClause}
      group by
        sessions.id,
        sessions.title,
        sessions.recap,
        sessions.notes,
        sessions.notes_document,
        sessions.unresolved_hooks,
        sessions.created_at,
        sessions.updated_at
      order by
        coalesce(sessions.started_at, sessions.created_at) desc,
        sessions.updated_at desc,
        sessions.title asc
    `;
}

function requireSessionId(
  row: Pick<SessionRow, "id"> | undefined,
  errorMessage: string,
) {
  if (!row) {
    throw new Error(errorMessage);
  }

  return row.id;
}

function requireSessionRow(row: SessionRow | undefined, errorMessage: string) {
  if (!row) {
    throw new Error(errorMessage);
  }

  return mapSessionRow(row);
}

function mapUnresolvedHooks(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((hook): hook is string => typeof hook === "string");
}

function mapTaggedEntities(value: unknown): CampaignEntitySummary[] {
  const rawEntities = typeof value === "string" ? parseJson(value) : value;

  if (!Array.isArray(rawEntities)) {
    return [];
  }

  return rawEntities.flatMap((entity): CampaignEntitySummary[] => {
    if (!isTaggedEntityRecord(entity)) {
      return [];
    }

    return [
      {
        id: entity.id,
        name: entity.name,
        summary: entity.summary,
        type: entity.type,
        visibility: entity.visibility,
      },
    ];
  });
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

function isTaggedEntityRecord(value: unknown): value is {
  id: string;
  name: string;
  summary: string;
  type: EntityType;
  visibility: Visibility;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entity = value as Record<string, unknown>;

  return (
    typeof entity.id === "string" &&
    typeof entity.name === "string" &&
    typeof entity.summary === "string" &&
    isEntityType(entity.type) &&
    isVisibility(entity.visibility)
  );
}

function isEntityType(value: unknown): value is EntityType {
  return (
    value === "npc" ||
    value === "location" ||
    value === "faction" ||
    value === "quest" ||
    value === "item"
  );
}

function isVisibility(value: unknown): value is Visibility {
  return value === "dm-only" || value === "player-safe";
}

function createNotesPreview(notes: string) {
  const compactNotes = notes.replace(/\s+/g, " ").trim();

  if (!compactNotes) {
    return "No recap has been generated yet.";
  }

  return compactNotes.length > 220
    ? `${compactNotes.slice(0, 217).trim()}...`
    : compactNotes;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
