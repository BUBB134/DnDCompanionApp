import type { AuthUser, Campaign, CampaignRole } from "@dnd/types";
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseQueryable,
} from "@dnd/db";
import type { NormalizedCreateCampaignInput } from "@/campaigns/create-campaign";

type CampaignRow = {
  id: string;
  name: string;
  role: CampaignRole;
  summary: string | null;
};

type InsertCampaignRow = {
  id: string;
  name: string;
  summary: string | null;
};

export async function listDatabaseCampaignsForUser(userId: string) {
  const result = await queryDatabase<CampaignRow>(
    `
      select
        campaigns.id,
        campaigns.name,
        campaigns.summary,
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
      insert into campaigns (name, summary, created_by_user_id)
      values ($1, $2, $3)
      returning id, name, summary
    `,
    [input.name, input.summary, user.id],
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

  return {
    ...campaign,
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
    summary: row.summary,
  };
}
