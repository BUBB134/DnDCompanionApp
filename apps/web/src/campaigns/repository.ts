import type { AuthUser, Campaign, CampaignRole } from "@dnd/types";
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseQueryable,
} from "@dnd/db";
import {
  DEFAULT_CAMPAIGN_RULESET,
  type NormalizedCreateCampaignInput,
} from "@/campaigns/create-campaign";

type CampaignRow = {
  id: string;
  name: string;
  onboarding_completed_at: Date | string | null;
  role: CampaignRole;
  ruleset: string | null;
  starting_location: string | null;
  summary: string | null;
  tone: string | null;
};

type InsertCampaignRow = {
  id: string;
  name: string;
  onboarding_completed_at: Date | string | null;
  ruleset: string | null;
  starting_location: string | null;
  summary: string | null;
  tone: string | null;
};

export async function listDatabaseCampaignsForUser(userId: string) {
  const result = await queryDatabase<CampaignRow>(
    `
      select
        campaigns.id,
        campaigns.name,
        campaigns.summary,
        campaigns.ruleset,
        campaigns.tone,
        campaigns.starting_location,
        campaigns.onboarding_completed_at,
        campaign_memberships.role
      from campaign_memberships
      inner join campaigns on campaigns.id = campaign_memberships.campaign_id
      where campaign_memberships.user_id = $1
      order by campaigns.created_at desc, campaigns.name asc
    `,
    [userId],
  );

  return result.rows.map(mapCampaignRow);
}

export async function getDatabaseCampaignAccessForUser(
  userId: string,
  campaignId: string,
) {
  const result = await queryDatabase<CampaignRow>(
    `
      select
        campaigns.id,
        campaigns.name,
        campaigns.summary,
        campaigns.ruleset,
        campaigns.tone,
        campaigns.starting_location,
        campaigns.onboarding_completed_at,
        campaign_memberships.role
      from campaign_memberships
      inner join campaigns on campaigns.id = campaign_memberships.campaign_id
      where campaign_memberships.user_id = $1
        and campaigns.id = $2
      limit 1
    `,
    [userId, campaignId],
  );

  return result.rows[0] ? mapCampaignRow(result.rows[0]) : null;
}

export async function createCampaignForUser(
  user: AuthUser,
  input: NormalizedCreateCampaignInput,
) {
  return withDatabaseTransaction((client) =>
    createCampaignInTransaction(client, user, input),
  );
}

export async function createCampaignInTransaction(
  client: DatabaseQueryable,
  user: AuthUser,
  input: NormalizedCreateCampaignInput,
) {
  await upsertUser(client, user);

  const campaignResult = await client.query<InsertCampaignRow>(
    `
      insert into campaigns (
        name,
        summary,
        created_by_user_id,
        ruleset,
        tone,
        starting_location,
        onboarding_completed_at
      )
      values ($1, $2, $3, $4, $5, $6, now())
      returning
        id,
        name,
        summary,
        ruleset,
        tone,
        starting_location,
        onboarding_completed_at
    `,
    [
      input.name,
      input.summary,
      user.id,
      input.ruleset || DEFAULT_CAMPAIGN_RULESET,
      input.tone,
      input.startingLocation,
    ],
  );
  const campaign = campaignResult.rows[0];

  if (!campaign) {
    throw new Error("Campaign creation did not return a campaign record.");
  }

  await client.query(
    `
      insert into campaign_memberships (campaign_id, user_id, role)
      values ($1, $2, 'dm')
    `,
    [campaign.id, user.id],
  );

  await createInitialSessionIfNeeded(client, campaign.id, input);

  return {
    ...mapCreatedCampaignRow(campaign),
    role: "dm",
  } satisfies Campaign;
}

async function upsertUser(client: DatabaseQueryable, user: AuthUser) {
  await client.query(
    `
      insert into users (id, email, name)
      values ($1, $2, $3)
      on conflict (id) do update
      set email = excluded.email,
          name = excluded.name,
          updated_at = now()
    `,
    [user.id, user.email, user.name],
  );
}

function mapCampaignRow(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    setup: {
      onboardingCompletedAt: row.onboarding_completed_at
        ? toIsoString(row.onboarding_completed_at)
        : null,
      ruleset: row.ruleset || DEFAULT_CAMPAIGN_RULESET,
      startingLocation: row.starting_location,
      tone: row.tone,
    },
    summary: row.summary,
  };
}

async function createInitialSessionIfNeeded(
  client: DatabaseQueryable,
  campaignId: string,
  input: NormalizedCreateCampaignInput,
) {
  if (
    !input.firstSessionTitle &&
    !input.openingHook &&
    !input.startingLocation
  ) {
    return;
  }

  const notes = createInitialSessionNotes(input);
  const notesDocument = {
    blocks: notes
      ? [
          {
            id: "onboarding-setup-notes",
            references: [],
            text: notes,
            type: "paragraph",
          },
        ]
      : [],
    version: 1,
  };

  await client.query(
    `
      insert into sessions (
        campaign_id,
        title,
        notes,
        notes_document,
        unresolved_hooks
      )
      values ($1, $2, $3, $4::jsonb, $5::jsonb)
    `,
    [
      campaignId,
      input.firstSessionTitle || "Session zero",
      notes,
      JSON.stringify(notesDocument),
      JSON.stringify(input.openingHook ? [input.openingHook] : []),
    ],
  );
}

function createInitialSessionNotes(input: NormalizedCreateCampaignInput) {
  return [
    `Ruleset: ${input.ruleset || DEFAULT_CAMPAIGN_RULESET}`,
    input.tone ? `Tone: ${input.tone}` : null,
    input.startingLocation
      ? `Starting location: ${input.startingLocation}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");
}

function mapCreatedCampaignRow(row: InsertCampaignRow): Omit<Campaign, "role"> {
  return {
    id: row.id,
    name: row.name,
    setup: {
      onboardingCompletedAt: row.onboarding_completed_at
        ? toIsoString(row.onboarding_completed_at)
        : null,
      ruleset: row.ruleset || DEFAULT_CAMPAIGN_RULESET,
      startingLocation: row.starting_location,
      tone: row.tone,
    },
    summary: row.summary,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
