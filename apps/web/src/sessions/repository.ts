import type { CampaignSession, SessionSummary } from "@dnd/types";
import { queryDatabase } from "@dnd/db";
import type { SessionMutationInput } from "@/sessions/manage-session";

type SessionRow = {
  created_at: Date | string;
  id: string;
  notes: string;
  recap: string;
  title: string;
  unresolved_hooks: unknown;
  updated_at: Date | string;
};

export async function listSessionsForUser(
  userId: string,
  campaignId: string,
) {
  const result = await queryDatabase<SessionRow>(
    `
      select
        sessions.id,
        sessions.title,
        sessions.recap,
        sessions.notes,
        sessions.unresolved_hooks,
        sessions.created_at,
        sessions.updated_at
      from sessions
      inner join campaign_memberships
        on campaign_memberships.campaign_id = sessions.campaign_id
      where campaign_memberships.user_id = $1
        and sessions.campaign_id = $2
      order by
        coalesce(sessions.started_at, sessions.created_at) desc,
        sessions.updated_at desc,
        sessions.title asc
    `,
    [userId, campaignId],
  );

  return result.rows.map(mapSessionRow);
}

export async function getLatestSessionForUser(
  userId: string,
  campaignId: string,
): Promise<SessionSummary | null> {
  const result = await queryDatabase<SessionRow>(
    `
      select
        sessions.id,
        sessions.title,
        sessions.recap,
        sessions.notes,
        sessions.unresolved_hooks,
        sessions.created_at,
        sessions.updated_at
      from sessions
      inner join campaign_memberships
        on campaign_memberships.campaign_id = sessions.campaign_id
      where campaign_memberships.user_id = $1
        and sessions.campaign_id = $2
      order by
        coalesce(sessions.started_at, sessions.created_at) desc,
        sessions.updated_at desc,
        sessions.title asc
      limit 1
    `,
    [userId, campaignId],
  );

  return result.rows[0] ? mapSessionSummaryRow(result.rows[0]) : null;
}

export async function createSessionForUser(
  userId: string,
  input: SessionMutationInput,
) {
  const result = await queryDatabase<SessionRow>(
    `
      insert into sessions (
        campaign_id,
        title,
        notes,
        unresolved_hooks
      )
      select
        campaign_memberships.campaign_id,
        $3,
        $4,
        $5::jsonb
      from campaign_memberships
      where campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = $2
      returning
        id,
        title,
        recap,
        notes,
        unresolved_hooks,
        created_at,
        updated_at
    `,
    [
      userId,
      input.campaignId,
      input.title,
      input.notes,
      JSON.stringify(input.unresolvedHooks),
    ],
  );

  return requireSessionRow(
    result.rows[0],
    "You do not have access to create sessions for this campaign.",
  );
}

export async function updateSessionForUser(
  userId: string,
  sessionId: string,
  input: SessionMutationInput,
) {
  const result = await queryDatabase<SessionRow>(
    `
      update sessions
      set
        title = $4,
        notes = $5,
        unresolved_hooks = $6::jsonb,
        updated_at = now()
      from campaign_memberships
      where sessions.id = $3
        and sessions.campaign_id = $2
        and campaign_memberships.campaign_id = sessions.campaign_id
        and campaign_memberships.user_id = $1
      returning
        sessions.id,
        sessions.title,
        sessions.recap,
        sessions.notes,
        sessions.unresolved_hooks,
        sessions.created_at,
        sessions.updated_at
    `,
    [
      userId,
      input.campaignId,
      sessionId,
      input.title,
      input.notes,
      JSON.stringify(input.unresolvedHooks),
    ],
  );

  return requireSessionRow(
    result.rows[0],
    "You do not have access to update this session.",
  );
}

function mapSessionRow(row: SessionRow): CampaignSession {
  return {
    ...mapSessionSummaryRow(row),
    createdAt: toIsoString(row.created_at),
    notes: row.notes,
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapSessionSummaryRow(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    recap: row.recap || createNotesPreview(row.notes),
    title: row.title,
    unresolvedHooks: mapUnresolvedHooks(row.unresolved_hooks),
  };
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
