import { formatDatabaseError } from "@dnd/db";
import { EmptyState, Surface } from "@dnd/ui";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/auth/server";
import {
  isDatabaseCampaignId,
  isDatabaseId,
} from "@/campaigns/database-id";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";
import { getCharacterForUser } from "@/characters/repository";
import { CharacterLevelUpForm } from "@/components/character-level-up-form";

type CharacterLevelUpPageProps = {
  params: Promise<{
    campaignId: string;
    characterId: string;
  }>;
};

export default async function CharacterLevelUpPage({
  params,
}: CharacterLevelUpPageProps) {
  const { campaignId, characterId } = await params;

  if (!isDatabaseCampaignId(campaignId) || !isDatabaseId(characterId)) {
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
        <EmptyState body={loadError} title="Level-up is unavailable" />
      </Surface>
    );
  }

  if (
    !character ||
    character.accessLevel !== "full" ||
    !character.canEdit
  ) {
    notFound();
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[#164f56] underline decoration-[#1f6f78]/45 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
          href={
            `/campaigns/${campaign.id}/characters/${character.id}` as Route
          }
        >
          Back to {character.name}
        </Link>
      </div>
      <CharacterLevelUpForm
        campaign={campaign}
        character={character}
      />
    </div>
  );
}
