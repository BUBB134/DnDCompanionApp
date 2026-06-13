import { formatDatabaseError } from "@dnd/db";
import { notFound } from "next/navigation";
import { EmptyState, Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";
import { getCharacterForUser } from "@/characters/repository";
import { CharacterProfile } from "@/components/character-profile";

type CharacterDetailPageProps = {
  params: Promise<{
    campaignId: string;
    characterId: string;
  }>;
};

export default async function CharacterDetailPage({
  params,
}: CharacterDetailPageProps) {
  const session = await requireAuthSession();
  const { campaignId, characterId } = await params;
  const campaign = await getDatabaseCampaignAccessForUser(
    session.user.id,
    campaignId,
  );

  if (!campaign) {
    notFound();
  }

  let character: Awaited<ReturnType<typeof getCharacterForUser>> = null;
  let loadError: string | null = null;

  try {
    character = await getCharacterForUser(
      session.user.id,
      campaign.id,
      characterId,
    );
  } catch (error) {
    loadError = formatDatabaseError(error);
  }

  if (loadError) {
    return (
      <Surface className="p-5">
        <EmptyState body={loadError} title="Character is unavailable" />
      </Surface>
    );
  }

  if (!character) {
    notFound();
  }

  return <CharacterProfile campaign={campaign} character={character} />;
}
