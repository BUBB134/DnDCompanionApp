import type { AuthSession, Campaign, CampaignMembership, RuleSnippet, SessionSummary } from "@dnd/types";
import {
  filterByVisibility,
  isDungeonMaster,
  resolveCampaignAccess,
} from "@dnd/types";
import { createLocalUserId } from "@/auth/local-user";

type CampaignRuleSnippet = RuleSnippet & {
  campaignId: string;
};

type CampaignSessionSummary = SessionSummary & {
  campaignId: string;
};

export type CampaignHomeData = {
  campaign: Campaign;
  dmBrief: string | null;
  latestSession: SessionSummary;
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

export function getCurrentCampaignAccess(
  session: AuthSession,
  campaignId?: string | null,
) {
  return resolveCampaignAccess({
    campaignId,
    campaigns: bootstrapCampaigns,
    memberships: bootstrapMemberships,
    userId: session.user.id,
  });
}

export function getCampaignHomeData(session: AuthSession): CampaignHomeData | null {
  const campaign = getCurrentCampaignAccess(session);

  if (!campaign) {
    return null;
  }

  const latestSession = bootstrapSessions.find(
    (sessionSummary) => sessionSummary.campaignId === campaign.id,
  );

  if (!latestSession) {
    return null;
  }

  return {
    campaign,
    dmBrief: isDungeonMaster(campaign.role)
      ? bootstrapDmBriefs[campaign.id] ?? null
      : null,
    latestSession,
    rules: filterByVisibility(
      bootstrapRules.filter((rule) => rule.campaignId === campaign.id),
      campaign.role,
    ),
  };
}
