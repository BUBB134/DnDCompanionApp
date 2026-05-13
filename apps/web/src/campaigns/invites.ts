import { createHash, randomBytes } from "node:crypto";
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseQueryable,
} from "@dnd/db";
import type {
  AuthUser,
  Campaign,
  CampaignInviteSummary,
  CampaignRole,
} from "@dnd/types";
import { DEFAULT_CAMPAIGN_RULESET } from "@/campaigns/create-campaign";

const CAMPAIGN_INVITE_TOKEN_BYTES = 32;
const CAMPAIGN_INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
export const CAMPAIGN_INVITE_TTL_DAYS = 7;

type CampaignInviteRow = {
  campaign_id: string;
  created_at: Date | string;
  expires_at: Date | string;
  id: string;
  revoked_at: Date | string | null;
};

type CampaignInviteWithCampaignRow = CampaignInviteRow & {
  campaign_name: string;
  campaign_onboarding_completed_at: Date | string | null;
  campaign_ruleset: string | null;
  campaign_starting_location: string | null;
  campaign_summary: string | null;
  campaign_tone: string | null;
};

type CampaignInviteCampaign = {
  id: string;
  name: string;
  summary: string | null;
};

export type GeneratedCampaignInvite = CampaignInviteSummary & {
  token: string;
};

export type GenerateCampaignInviteActionState = {
  expiresAt: string | null;
  formError: string | null;
  inviteId: string | null;
  inviteUrl: string | null;
};

export type CampaignInviteLookup =
  | {
      status: "invalid";
    }
  | {
      campaign: CampaignInviteCampaign;
      invite: CampaignInviteSummary;
      status: "expired" | "ready" | "revoked";
    };

export type CampaignInviteAcceptanceResult =
  | {
      campaign: Campaign;
      status: "accepted" | "already-member";
    }
  | {
      status: "expired" | "invalid" | "revoked";
    };

export const initialGenerateCampaignInviteActionState: GenerateCampaignInviteActionState = {
  expiresAt: null,
  formError: null,
  inviteId: null,
  inviteUrl: null,
};

export class CampaignInviteError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CampaignInviteError";
  }
}

export class CampaignInvitePermissionError extends CampaignInviteError {
  constructor(message = "Only campaign DMs can manage invite links.") {
    super(message);
    this.name = "CampaignInvitePermissionError";
  }
}

export async function getActiveCampaignInviteForUser(
  userId: string,
  campaignId: string,
) {
  const result = await queryDatabase<CampaignInviteRow>(
    `
      select
        campaign_invites.id,
        campaign_invites.campaign_id,
        campaign_invites.expires_at,
        campaign_invites.revoked_at,
        campaign_invites.created_at
      from campaign_invites
      inner join campaign_memberships
        on campaign_memberships.campaign_id = campaign_invites.campaign_id
      where campaign_invites.campaign_id = $1
        and campaign_memberships.user_id = $2
        and campaign_memberships.role = 'dm'
        and campaign_invites.revoked_at is null
        and campaign_invites.expires_at > now()
      order by campaign_invites.created_at desc
      limit 1
    `,
    [campaignId, userId],
  );

  return result.rows[0] ? mapInviteSummary(result.rows[0]) : null;
}

export async function createCampaignInviteForUser(
  user: AuthUser,
  campaignId: string,
  now = new Date(),
): Promise<GeneratedCampaignInvite> {
  const token = createCampaignInviteToken();
  const tokenHash = hashCampaignInviteToken(token);
  const expiresAt = new Date(
    now.getTime() + CAMPAIGN_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  return withDatabaseTransaction(async (client) => {
    await assertCanManageCampaignInvites(client, user.id, campaignId);
    await client.query(
      `
        update campaign_invites
        set revoked_at = now()
        where campaign_id = $1
          and revoked_at is null
          and expires_at > now()
      `,
      [campaignId],
    );

    const result = await client.query<CampaignInviteRow>(
      `
        insert into campaign_invites (
          campaign_id,
          token_hash,
          created_by_user_id,
          expires_at
        )
        values ($1, $2, $3, $4)
        returning id, campaign_id, expires_at, revoked_at, created_at
      `,
      [campaignId, tokenHash, user.id, expiresAt],
    );
    const invite = result.rows[0];

    if (!invite) {
      throw new CampaignInviteError("Invite creation did not return a record.");
    }

    return {
      ...mapInviteSummary(invite),
      token,
    };
  });
}

export async function revokeCampaignInviteForUser(
  userId: string,
  campaignId: string,
  inviteId: string,
) {
  await withDatabaseTransaction(async (client) => {
    await assertCanManageCampaignInvites(client, userId, campaignId);
    await client.query(
      `
        update campaign_invites
        set revoked_at = now()
        where id = $1
          and campaign_id = $2
          and revoked_at is null
      `,
      [inviteId, campaignId],
    );
  });
}

export async function getCampaignInvite(
  token: string,
  now = new Date(),
): Promise<CampaignInviteLookup> {
  if (!isCampaignInviteToken(token)) {
    return { status: "invalid" };
  }

  const result = await queryDatabase<CampaignInviteWithCampaignRow>(
    `
      select
        campaign_invites.id,
        campaign_invites.campaign_id,
        campaign_invites.expires_at,
        campaign_invites.revoked_at,
        campaign_invites.created_at,
        campaigns.name as campaign_name,
        campaigns.summary as campaign_summary,
        campaigns.ruleset as campaign_ruleset,
        campaigns.tone as campaign_tone,
        campaigns.starting_location as campaign_starting_location,
        campaigns.onboarding_completed_at as campaign_onboarding_completed_at
      from campaign_invites
      inner join campaigns on campaigns.id = campaign_invites.campaign_id
      where campaign_invites.token_hash = $1
      limit 1
    `,
    [hashCampaignInviteToken(token)],
  );

  const invite = result.rows[0];

  if (!invite) {
    return { status: "invalid" };
  }

  const unavailableStatus = getUnavailableInviteStatus(invite, now);

  return {
    campaign: mapInviteCampaign(invite),
    invite: mapInviteSummary(invite),
    status: unavailableStatus ?? "ready",
  };
}

export async function acceptCampaignInviteForUser(
  user: AuthUser,
  token: string,
  now = new Date(),
): Promise<CampaignInviteAcceptanceResult> {
  if (!isCampaignInviteToken(token)) {
    return { status: "invalid" };
  }

  return withDatabaseTransaction(async (client) => {
    await upsertInvitedUser(client, user);

    const inviteResult = await client.query<CampaignInviteWithCampaignRow>(
      `
        select
          campaign_invites.id,
          campaign_invites.campaign_id,
          campaign_invites.expires_at,
          campaign_invites.revoked_at,
          campaign_invites.created_at,
          campaigns.name as campaign_name,
          campaigns.summary as campaign_summary,
          campaigns.ruleset as campaign_ruleset,
          campaigns.tone as campaign_tone,
          campaigns.starting_location as campaign_starting_location,
          campaigns.onboarding_completed_at as campaign_onboarding_completed_at
        from campaign_invites
        inner join campaigns on campaigns.id = campaign_invites.campaign_id
        where campaign_invites.token_hash = $1
        limit 1
        for update of campaign_invites
      `,
      [hashCampaignInviteToken(token)],
    );
    const invite = inviteResult.rows[0];

    if (!invite) {
      return { status: "invalid" };
    }

    const unavailableStatus = getUnavailableInviteStatus(invite, now);

    if (unavailableStatus) {
      return { status: unavailableStatus };
    }

    const existingMembership = await getCampaignMembershipRole(
      client,
      invite.campaign_id,
      user.id,
    );

    if (existingMembership) {
      await recordInviteAcceptance(client, invite.id, user.id);

      return {
        campaign: mapInviteCampaignAccess(invite, existingMembership),
        status: "already-member",
      };
    }

    const insertedMembership = await client.query<{ role: CampaignRole }>(
      `
        insert into campaign_memberships (campaign_id, user_id, role)
        values ($1, $2, 'player')
        on conflict (campaign_id, user_id) do nothing
        returning role
      `,
      [invite.campaign_id, user.id],
    );
    const membershipRole =
      insertedMembership.rows[0]?.role ??
      (await getCampaignMembershipRole(client, invite.campaign_id, user.id));

    await recordInviteAcceptance(client, invite.id, user.id);

    return {
      campaign: mapInviteCampaignAccess(invite, membershipRole ?? "player"),
      status: insertedMembership.rows[0] ? "accepted" : "already-member",
    };
  });
}

async function assertCanManageCampaignInvites(
  client: DatabaseQueryable,
  userId: string,
  campaignId: string,
) {
  const result = await client.query<{ role: CampaignRole }>(
    `
      select role
      from campaign_memberships
      where campaign_id = $1
        and user_id = $2
      limit 1
    `,
    [campaignId, userId],
  );

  if (result.rows[0]?.role !== "dm") {
    throw new CampaignInvitePermissionError();
  }
}

async function getCampaignMembershipRole(
  client: DatabaseQueryable,
  campaignId: string,
  userId: string,
) {
  const result = await client.query<{ role: CampaignRole }>(
    `
      select role
      from campaign_memberships
      where campaign_id = $1
        and user_id = $2
      limit 1
    `,
    [campaignId, userId],
  );

  return result.rows[0]?.role ?? null;
}

async function upsertInvitedUser(client: DatabaseQueryable, user: AuthUser) {
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

async function recordInviteAcceptance(
  client: DatabaseQueryable,
  inviteId: string,
  userId: string,
) {
  await client.query(
    `
      insert into campaign_invite_acceptances (invite_id, user_id)
      values ($1, $2)
      on conflict (invite_id, user_id) do nothing
    `,
    [inviteId, userId],
  );
}

function getUnavailableInviteStatus(
  invite: CampaignInviteRow,
  now: Date,
): "expired" | "revoked" | null {
  if (invite.revoked_at) {
    return "revoked";
  }

  if (Date.parse(toIsoString(invite.expires_at)) <= now.getTime()) {
    return "expired";
  }

  return null;
}

function mapInviteSummary(row: CampaignInviteRow): CampaignInviteSummary {
  return {
    campaignId: row.campaign_id,
    createdAt: toIsoString(row.created_at),
    expiresAt: toIsoString(row.expires_at),
    id: row.id,
    revokedAt: row.revoked_at ? toIsoString(row.revoked_at) : null,
  };
}

function mapInviteCampaign(row: CampaignInviteWithCampaignRow): CampaignInviteCampaign {
  return {
    id: row.campaign_id,
    name: row.campaign_name,
    summary: row.campaign_summary,
  };
}

function mapInviteCampaignAccess(
  row: CampaignInviteWithCampaignRow,
  role: CampaignRole,
): Campaign {
  return {
    id: row.campaign_id,
    name: row.campaign_name,
    role,
    setup: {
      onboardingCompletedAt: row.campaign_onboarding_completed_at
        ? toIsoString(row.campaign_onboarding_completed_at)
        : null,
      ruleset: row.campaign_ruleset || DEFAULT_CAMPAIGN_RULESET,
      startingLocation: row.campaign_starting_location,
      tone: row.campaign_tone,
    },
    summary: row.campaign_summary,
  };
}

function createCampaignInviteToken() {
  return randomBytes(CAMPAIGN_INVITE_TOKEN_BYTES).toString("base64url");
}

function hashCampaignInviteToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function isCampaignInviteToken(token: string) {
  return CAMPAIGN_INVITE_TOKEN_PATTERN.test(token);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
