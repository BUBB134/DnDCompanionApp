export const campaignRoles = ["dm", "player"] as const;
export type CampaignRole = (typeof campaignRoles)[number];

export const visibilities = ["dm-only", "player-safe"] as const;
export type Visibility = (typeof visibilities)[number];

export const entityTypes = ["npc", "location", "faction", "quest", "item"] as const;
export type EntityType = (typeof entityTypes)[number];

export const ruleSnippetCategories = [
  "condition",
  "core-mechanic",
  "ability",
] as const;
export type RuleSnippetCategory = (typeof ruleSnippetCategories)[number];

export type CampaignSummary = {
  activeSessionId?: string;
  id: string;
  name: string;
  summary?: string | null;
};

export type CampaignMembership = {
  campaignId: string;
  role: CampaignRole;
  userId: string;
};

export type CampaignAccess = CampaignSummary & {
  role: CampaignRole;
};

export type Campaign = CampaignAccess;

export type SessionSummary = {
  id: string;
  recap: string;
  title: string;
  unresolvedHooks: string[];
};

export type RuleSnippet = {
  category: RuleSnippetCategory;
  id: string;
  summary: string;
  title: string;
  visibility: Visibility;
};

export type AbilitySummary = {
  characterId: string;
  id: string;
  name: string;
  summary: string;
  trigger?: string;
};

type ResolveCampaignAccessInput = {
  campaignId?: string | null;
  campaigns: readonly CampaignSummary[];
  memberships: readonly CampaignMembership[];
  userId: string;
};

type VisibilityScoped = {
  visibility: Visibility;
};

export function isDungeonMaster(role: CampaignRole) {
  return role === "dm";
}

export function canAccessVisibility(role: CampaignRole, visibility: Visibility) {
  return isDungeonMaster(role) || visibility === "player-safe";
}

export function filterByVisibility<T extends VisibilityScoped>(
  items: readonly T[],
  role: CampaignRole,
) {
  return items.filter((item) => canAccessVisibility(role, item.visibility));
}

export function resolveCampaignAccess({
  campaignId,
  campaigns,
  memberships,
  userId,
}: ResolveCampaignAccessInput): CampaignAccess | null {
  const userMemberships = memberships.filter((membership) => membership.userId === userId);

  if (userMemberships.length === 0) {
    return null;
  }

  if (campaignId) {
    return mergeCampaignAccess(
      campaigns.find((campaign) => campaign.id === campaignId),
      userMemberships.find((membership) => membership.campaignId === campaignId),
    );
  }

  for (const campaign of campaigns) {
    const membership = userMemberships.find(
      (candidateMembership) => candidateMembership.campaignId === campaign.id,
    );

    if (membership) {
      return mergeCampaignAccess(campaign, membership);
    }
  }

  return null;
}

function mergeCampaignAccess(
  campaign: CampaignSummary | undefined,
  membership: CampaignMembership | undefined,
): CampaignAccess | null {
  if (!campaign || !membership) {
    return null;
  }

  return {
    ...campaign,
    role: membership.role,
  };
}

