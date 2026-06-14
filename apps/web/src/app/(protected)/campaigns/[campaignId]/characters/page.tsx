import { formatDatabaseError } from "@dnd/db";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/auth/server";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";
import { listCharacterSummariesForUser } from "@/characters/repository";
import { CharacterListView } from "@/components/character-list-view";

type CharacterListPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function CharacterListPage({
  params,
}: CharacterListPageProps) {
  const { campaignId } = await params;

  if (!isDatabaseCampaignId(campaignId)) {
    notFound();
  }

  const session = await requireAuthSession();
  const campaign = await getDatabaseCampaignAccessForUser(
    session.user.id,
    campaignId,
  );

  if (!campaign) {
    notFound();
  }

  let characters: Awaited<
    ReturnType<typeof listCharacterSummariesForUser>
  > = [];
  let loadError: string | null = null;

  try {
    characters = await listCharacterSummariesForUser(
      session.user.id,
      campaign.id,
    );
  } catch (error) {
    loadError = formatDatabaseError(error);
  }

  return (
    <CharacterListView
      campaign={campaign}
      characters={characters}
      loadError={loadError}
    />
  );
}
