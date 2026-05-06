import type {
  AuthSession,
  Campaign,
  CampaignEntitySummary,
  CampaignMembership,
  RuleSnippet,
  SessionSummary,
} from "@dnd/types";
import {
  filterByVisibility,
  isDungeonMaster,
  resolveCampaignAccess,
} from "@dnd/types";
import { createLocalUserId } from "@/auth/local-user";
import { getActiveCampaignId } from "@/campaigns/active-campaign";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import {
  getDatabaseCampaignAccessForUser,
  listDatabaseCampaignsForUser,
} from "@/campaigns/repository";
import { listEntitySummariesForUser } from "@/entities/repository";
import { coreRuleSnippets } from "@/rules/core-rules";
import { findReferencedRules } from "@/rules/matching";
import { listRuleSnippetsForUser } from "@/rules/repository";
import { getLatestSessionForUser } from "@/sessions/repository";

type CampaignSessionSummary = SessionSummary & {
  campaignId: string;
};

type CampaignEntityRecord = CampaignEntitySummary & {
  campaignId: string;
};

export type CampaignDashboardData = {
  campaign: Campaign;
  dmBrief: string | null;
  entities: CampaignEntitySummary[];
  latestSession: SessionSummary | null;
  rules: RuleSnippet[];
};

export type CampaignHomeData = CampaignDashboardData;

const bootstrapCampaigns = [
  {
    activeSessionId: "session-12",
    id: "campaign-ashen-coast",
    name: "Ashen Coast",
  },
] as const;

const bootstrapMemberships: readonly CampaignMembership[] = [
  {
    campaignId: "campaign-ashen-coast",
    role: "dm",
    userId: createLocalUserId("dm@local.test"),
  },
  {
    campaignId: "campaign-ashen-coast",
    role: "player",
    userId: createLocalUserId("player@local.test"),
  },
] as const;

const bootstrapEntities: readonly CampaignEntityRecord[] = [
  {
    campaignId: "campaign-ashen-coast",
    id: "entity-captain-thorn",
    name: "Captain Thorn",
    summary:
      "A tide-worn privateer with a useful harbor chart and a reputation the party has not fully tested.",
    type: "npc",
    visibility: "player-safe",
  },
  {
    campaignId: "campaign-ashen-coast",
    id: "entity-sunken-lighthouse",
    name: "Sunken lighthouse",
    summary:
      "The half-flooded beacon below the Ashen Coast still anchors the party's open vault mystery.",
    type: "location",
    visibility: "player-safe",
  },
  {
    campaignId: "campaign-ashen-coast",
    id: "entity-lantern-ward",
    name: "Lantern ward",
    summary:
      "A hidden flood-clock trigger that should stay out of the player view until discovered in play.",
    type: "quest",
    visibility: "dm-only",
  },
] as const;

const bootstrapSessions: readonly CampaignSessionSummary[] = [
  {
    campaignId: "campaign-ashen-coast",
    id: "session-12",
    recap:
      "The party recovered the drowned keeper's journal, knocked a smuggler prone in the flooded stair, and left one sealed vault unopened while Mira held concentration.",
    taggedEntities: bootstrapEntities.slice(0, 2),
    title: "The lighthouse beneath the tide",
    unresolvedHooks: [
      "Decode the salt-stained map",
      "Decide what to tell Captain Thorn",
    ],
  },
] as const;

const bootstrapDmBriefs: Record<string, string> = {
  "campaign-ashen-coast":
    "Captain Thorn still works for the smugglers. If the party trusts him before clearing the vault, the lighthouse ward becomes an ambush instead of an ally.",
};

export async function getCurrentCampaignAccess(
  session: AuthSession,
  campaignId?: string | null,
) {
  const selectedCampaignId = campaignId ?? (await getActiveCampaignId());
  const databaseCampaign = await getCurrentDatabaseCampaignAccess(
    session.user.id,
    selectedCampaignId,
  );

  if (databaseCampaign) {
    return databaseCampaign;
  }

  return resolveCampaignAccess({
    campaignId: selectedCampaignId,
    campaigns: bootstrapCampaigns,
    memberships: bootstrapMemberships,
    userId: session.user.id,
  });
}

export async function getCampaignHomeData(
  session: AuthSession,
): Promise<CampaignHomeData | null> {
  const campaign = await getCurrentCampaignAccess(session);

  if (!campaign) {
    return null;
  }

  const isSavedCampaign = isDatabaseCampaignId(campaign.id);
  const databaseEntities = isSavedCampaign
    ? await getCurrentDatabaseEntitySummaries(session.user.id, campaign.id)
    : null;
  const databaseLatestSession = isSavedCampaign
    ? await getCurrentDatabaseLatestSession(session.user.id, campaign.id)
    : undefined;
  const databaseRules = isSavedCampaign
    ? await getCurrentDatabaseRuleSnippets(session.user.id, campaign.id)
    : null;

  return buildCampaignDashboardData(
    campaign,
    databaseEntities ?? undefined,
    databaseLatestSession,
    databaseRules ?? undefined,
  );
}

export async function getSelectedCampaignDashboardData(
  userId: string,
  campaignId: string,
) {
  const campaign = await getDatabaseCampaignAccessForUser(userId, campaignId);

  if (!campaign) {
    return null;
  }

  return buildCampaignDashboardData(
    campaign,
    await listEntitySummariesForUser(userId, campaign.id),
    await getLatestSessionForUser(userId, campaign.id),
    await listRuleSnippetsForUser(userId, campaign.id),
  );
}

export function buildCampaignDashboardData(
  campaign: Campaign,
  entities?: CampaignEntitySummary[],
  latestSessionOverride?: SessionSummary | null,
  rules?: RuleSnippet[],
): CampaignDashboardData {
  const latestSession =
    latestSessionOverride === undefined
      ? bootstrapSessions.find(
          (sessionSummary) => sessionSummary.campaignId === campaign.id,
        ) ?? null
      : latestSessionOverride;

  return {
    campaign,
    dmBrief: isDungeonMaster(campaign.role)
      ? bootstrapDmBriefs[campaign.id] ?? null
      : null,
    entities:
      entities ??
      filterByVisibility(
        bootstrapEntities.filter((entity) => entity.campaignId === campaign.id),
        campaign.role,
      ),
    latestSession,
    rules: latestSession
      ? findReferencedRules(
          [
            latestSession.title,
            latestSession.recap,
            ...latestSession.unresolvedHooks,
          ].join("\n"),
          rules ?? filterByVisibility(coreRuleSnippets, campaign.role),
        )
      : [],
  };
}

async function getCurrentDatabaseEntitySummaries(userId: string, campaignId: string) {
  try {
    return await listEntitySummariesForUser(userId, campaignId);
  } catch {
    return null;
  }
}

async function getCurrentDatabaseLatestSession(userId: string, campaignId: string) {
  try {
    return await getLatestSessionForUser(userId, campaignId);
  } catch {
    return null;
  }
}

async function getCurrentDatabaseRuleSnippets(userId: string, campaignId: string) {
  try {
    return await listRuleSnippetsForUser(userId, campaignId);
  } catch {
    return null;
  }
}

async function getCurrentDatabaseCampaignAccess(
  userId: string,
  campaignId?: string | null,
) {
  try {
    if (campaignId) {
      const selectedCampaign = await getDatabaseCampaignAccessForUser(
        userId,
        campaignId,
      );

      if (selectedCampaign) {
        return selectedCampaign;
      }
    }

    const campaigns = await listDatabaseCampaignsForUser(userId);

    return campaigns[0] ?? null;
  } catch {
    return null;
  }
}
