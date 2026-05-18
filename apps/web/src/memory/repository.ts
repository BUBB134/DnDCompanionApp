import type {
  Campaign,
  CampaignMemoryDocument,
  CampaignMemoryResult,
} from "@dnd/types";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";
import { listCharacterSummariesForUser } from "@/characters/repository";
import { listEntitiesForUser } from "@/entities/repository";
import {
  createCampaignMemoryDocuments,
  retrieveCampaignMemory,
  type CampaignMemoryRetrievalOptions,
} from "@/memory/retrieval";
import { listRuleSnippetsForUser } from "@/rules/repository";
import { listSessionsForUser } from "@/sessions/repository";

export type CampaignMemoryRetrieval = {
  campaign: Campaign;
  documents: CampaignMemoryDocument[];
  query: string;
  results: CampaignMemoryResult[];
};

export async function retrieveCampaignMemoryForUser(
  userId: string,
  campaignId: string,
  query: string,
  options: CampaignMemoryRetrievalOptions = {},
): Promise<CampaignMemoryRetrieval | null> {
  const campaign = await getDatabaseCampaignAccessForUser(userId, campaignId);

  if (!campaign) {
    return null;
  }

  const [sessions, entities, rules, characters] = await Promise.all([
    listSessionsForUser(userId, campaign.id),
    listEntitiesForUser(userId, campaign.id),
    listRuleSnippetsForUser(userId, campaign.id),
    listCharacterSummariesForUser(userId, campaign.id),
  ]);
  const documents = createCampaignMemoryDocuments({
    campaign,
    characters,
    entities,
    rules,
    sessions,
  });

  return {
    campaign,
    documents,
    query,
    results: retrieveCampaignMemory(query, documents, options),
  };
}
