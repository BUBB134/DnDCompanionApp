import type { AuthSession, Campaign, CampaignMembership, RuleSnippet, SessionSummary } from "@dnd/types";
import {
  filterByVisibility,
  isDungeonMaster,
  resolveCampaignAccess,
} from "@dnd/types";
import { createLocalUserId } from "@/auth/local-user";
import { getActiveCampaignId } from "@/campaigns/active-campaign";
import {
  getDatabaseCampaignAccessForUser,
  listDatabaseCampaignsForUser,
} from "@/campaigns/repository";

type CampaignRuleSnippet = RuleSnippet & {
  campaignId: string;
};

type CampaignSessionSummary = SessionSummary & {
  campaignId: string;
};

export type CampaignHomeData = {
  campaign: Campaign;
  dmBrief: string | null;
  latestSession: SessionSummary | null;
  rules: RuleSnippet[];
};

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

const bootstrapSessions: readonly CampaignSessionSummary[] = [
  {
    campaignId: "campaign-ashen-coast",
    id: "session-12",
    recap:
      "The party recovered the drowned keeper's journal, named Captain Thorn as a likely ally, and left one sealed vault unopened.",
    title: "The lighthouse beneath the tide",
    unresolvedHooks: ["Decode the salt-stained map", "Decide what to tell Captain Thorn"],
  },
] as const;

const bootstrapRules: readonly CampaignRuleSnippet[] = [
  {
    campaignId: "campaign-ashen-coast",
    category: "condition",
    id: "condition-prone",
    summary: "A quick reminder for movement cost and attack roll implications.",
    title: "Prone",
    visibility: "player-safe",
  },
  {
    campaignId: "campaign-ashen-coast",
    category: "core-mechanic",
    id: "mechanic-concentration",
    summary: "Track when damage or spell conflicts should trigger a check.",
    title: "Concentration",
    visibility: "player-safe",
  },
  {
    campaignId: "campaign-ashen-coast",
    category: "core-mechanic",
    id: "hazard-rising-tide",
    summary: "The hidden vault flood clock advances if the party trips the lantern ward.",
    title: "Hidden flood clock",
    visibility: "dm-only",
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

  const latestSession = bootstrapSessions.find(
    (sessionSummary) => sessionSummary.campaignId === campaign.id,
  );

  return {
    campaign,
    dmBrief: isDungeonMaster(campaign.role)
      ? bootstrapDmBriefs[campaign.id] ?? null
      : null,
    latestSession: latestSession ?? null,
    rules: latestSession
      ? filterByVisibility(
          bootstrapRules.filter((rule) => rule.campaignId === campaign.id),
          campaign.role,
        )
      : [],
  };
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
