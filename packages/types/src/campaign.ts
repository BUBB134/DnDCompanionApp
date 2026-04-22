export type CampaignRole = "dm" | "player";
export type Visibility = "dm-only" | "player-safe";

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
  category: "condition" | "core-mechanic" | "ability";
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

