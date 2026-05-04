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

export type Campaign = {
  activeSessionId?: string;
  id: string;
  name: string;
  role: CampaignRole;
};

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

