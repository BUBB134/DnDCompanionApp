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

export const sessionNoteBlockTypes = [
  "paragraph",
  "heading",
  "quote",
  "callout",
] as const;
export type SessionNoteBlockType = (typeof sessionNoteBlockTypes)[number];

export const sessionNoteReferenceTypes = ["character", "entity", "rule"] as const;
export const characterCreationOptionCategories = [
  "class",
  "ancestry",
  "background",
  "roleplay-trait",
] as const;
export type SessionNoteReferenceType =
  (typeof sessionNoteReferenceTypes)[number];

export const campaignMemorySourceTypes = [
  "character",
  "entity",
  "rule",
  "session-hook",
  "session-notes",
  "session-recap",
] as const;
export type CampaignMemorySourceType =
  (typeof campaignMemorySourceTypes)[number];

export type CampaignSummary = {
  activeSessionId?: string;
  id: string;
  name: string;
  setup?: CampaignSetup | null;
  summary?: string | null;
};

export type CampaignMembership = {
  campaignId: string;
  role: CampaignRole;
  userId: string;
};

export type CampaignInviteSummary = {
  campaignId: string;
  createdAt: string;
  expiresAt: string;
  id: string;
  revokedAt?: string | null;
};

export type CampaignAccess = CampaignSummary & {
  role: CampaignRole;
};

export type Campaign = CampaignAccess;

export type CampaignSetup = {
  onboardingCompletedAt?: string | null;
  ruleset: string;
  startingLocation?: string | null;
  tone?: string | null;
};

export type SessionSummary = {
  id: string;
  recap: string;
  recapGrounding: SessionRecapGrounding[];
  taggedEntities: readonly CampaignEntitySummary[];
  title: string;
  unresolvedHooks: string[];
};

export type CampaignSession = SessionSummary & {
  createdAt: string;
  notes: string;
  notesDocument: SessionNoteDocument;
  updatedAt: string;
};

export type SessionNoteReference = {
  endOffset: number;
  label: string;
  startOffset: number;
  targetId: string;
  targetType: SessionNoteReferenceType;
};

export type SessionNoteBlock = {
  id: string;
  references: SessionNoteReference[];
  text: string;
  type: SessionNoteBlockType;
};

export type SessionNoteDocument = {
  blocks: SessionNoteBlock[];
  version: 1;
};

export type CampaignEntitySummary = {
  id: string;
  name: string;
  summary: string;
  type: EntityType;
  visibility: Visibility;
};

export type CampaignEntity = CampaignEntitySummary & {
  description: string;
};

export type CampaignEntityBacklinkSession = {
  id: string;
  occurredAt: string;
  recap: string;
  title: string;
  updatedAt: string;
};

export type CampaignEntityMentionReference = {
  blockId: string;
  excerpt: string;
  label: string;
  occurredAt: string;
  sessionId: string;
  sessionTitle: string;
};

export type CampaignEntityBacklinks = {
  entityId: string;
  linkedSessions: CampaignEntityBacklinkSession[];
  mentionReferences: CampaignEntityMentionReference[];
};

export type CampaignEntityWithBacklinks = CampaignEntity & {
  backlinks: CampaignEntityBacklinks;
};

export type CampaignCharacterSummary = {
  ancestry?: string | null;
  background?: string | null;
  className?: string | null;
  id: string;
  isOwnedByCurrentUser: boolean;
  level: number;
  name: string;
  ownerName?: string | null;
  summary: string;
  visibility: Visibility;
};

export type CampaignCharacterFullView = CampaignCharacterSummary & {
  abilities: AbilitySummary[];
  accessLevel: "full";
  backstory: string;
  canEdit: boolean;
  goals: string;
  inventoryNotes: string;
  personalNotes: string;
  relationships: string;
  updatedAt: string;
};

export type CampaignCharacterSummaryView = CampaignCharacterSummary & {
  accessLevel: "summary";
  canEdit: false;
};

export type CampaignCharacterView =
  | CampaignCharacterFullView
  | CampaignCharacterSummaryView;

export type RuleSnippet = {
  aliases: string[];
  body: string;
  campaignId?: string | null;
  category: RuleSnippetCategory;
  contentKey?: string;
  id: string;
  slug: string;
  source?: string;
  sourceVersion?: string;
  summary: string;
  tags?: string[];
  title: string;
  visibility: Visibility;
};

export type AbilitySummary = {
  characterId: string;
  id: string;
  name: string;
  summary: string;
  trigger?: string | null;
  visibility: Visibility;
};

export type CharacterCreationOptionCategory =
  (typeof characterCreationOptionCategories)[number];

export type CharacterCreationAbility = {
  name: string;
  summary: string;
  trigger?: string | null;
};

export type CharacterCreationOption = {
  abilities: CharacterCreationAbility[];
  actions: string[];
  category: CharacterCreationOptionCategory;
  flavour: string;
  gameplay: string;
  id: string;
  magicCapable: boolean;
  name: string;
  proficiencies: string[];
  quirks: string[];
  slug: string;
  source: string;
  sourceVersion: string;
  summary: string;
  traits: string[];
};

export type CampaignMemoryMetadata = Record<
  string,
  boolean | null | number | string
>;

export type CampaignMemoryGrounding = {
  label: string;
  sourceId: string;
  sourcePath: string;
  sourceType: CampaignMemorySourceType;
};

export type SessionRecapGrounding = CampaignMemoryGrounding & {
  excerpt: string;
};

export type CampaignMemoryDocument = {
  body: string;
  campaignId: string;
  grounding: CampaignMemoryGrounding;
  id: string;
  keywords: string[];
  metadata: CampaignMemoryMetadata;
  sourceId: string;
  sourceType: CampaignMemorySourceType;
  summary: string;
  title: string;
  updatedAt?: string;
  visibility: Visibility;
};

export type CampaignMemoryResult = CampaignMemoryDocument & {
  excerpt: string;
  matchedTerms: string[];
  score: number;
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

