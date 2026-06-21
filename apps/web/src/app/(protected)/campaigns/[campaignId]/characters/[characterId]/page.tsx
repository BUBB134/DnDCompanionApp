import { formatDatabaseError } from "@dnd/db";
import { notFound } from "next/navigation";
import { EmptyState, Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import {
  isDatabaseCampaignId,
  isDatabaseId,
} from "@/campaigns/database-id";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";
import { buildCharacterActionHotbar } from "@/characters/action-hotbar";
import { loadCharacterCreationCatalogForUser } from "@/characters/creation-options";
import { getCharacterForUser } from "@/characters/repository";
import { CharacterProfile } from "@/components/character-profile";
import { loadCommonActionRulesForUser } from "@/rules/action-hotbar";
import { getCharacterSpellbookForUser } from "@/spells/repository";

type CharacterDetailPageProps = {
  params: Promise<{
    campaignId: string;
    characterId: string;
  }>;
};

export default async function CharacterDetailPage({
  params,
}: CharacterDetailPageProps) {
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
        <EmptyState body={loadError} title="Character is unavailable" />
      </Surface>
    );
  }

  if (!character) {
    notFound();
  }

  if (character.accessLevel === "summary") {
    return (
      <CharacterProfile
        campaign={campaign}
        character={character}
        hotbar={null}
        hotbarLoadNotice={null}
      />
    );
  }

  const [creationCatalog, commonActionCatalog, spellbookResult] =
    await Promise.all([
      loadCharacterCreationCatalogForUser(session.user.id, campaign.id),
      loadCommonActionRulesForUser(session.user.id, campaign.id),
      getCharacterSpellbookForUser(
        session.user.id,
        campaign.id,
        character.id,
      )
        .then((spellbook) => ({
          error: null,
          spellbook,
        }))
        .catch((error: unknown) => ({
          error: formatDatabaseError(error),
          spellbook: null,
        })),
    ]);
  const hotbar = buildCharacterActionHotbar(
    character,
    spellbookResult.spellbook,
    creationCatalog.options,
    commonActionCatalog.rules,
  );
  const hotbarLoadNotice = [
    creationCatalog.loadNotice,
    commonActionCatalog.loadNotice,
    spellbookResult.error
      ? `Spell state is unavailable: ${spellbookResult.error}`
      : null,
  ]
    .filter((notice): notice is string => Boolean(notice))
    .join(" ");

  return (
    <CharacterProfile
      campaign={campaign}
      character={character}
      hotbar={hotbar}
      hotbarLoadNotice={hotbarLoadNotice || null}
    />
  );
}
