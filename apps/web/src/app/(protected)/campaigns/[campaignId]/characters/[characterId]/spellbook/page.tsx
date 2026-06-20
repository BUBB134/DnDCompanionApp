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
import { CharacterSpellbookManager } from "@/components/character-spellbook-manager";
import { getCharacterSpellbookForUser } from "@/spells/repository";

type CharacterSpellbookPageProps = {
  params: Promise<{
    campaignId: string;
    characterId: string;
  }>;
};

export default async function CharacterSpellbookPage({
  params,
}: CharacterSpellbookPageProps) {
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

  let spellbook: Awaited<ReturnType<typeof getCharacterSpellbookForUser>> =
    null;
  let loadError: string | null = null;

  try {
    spellbook = await getCharacterSpellbookForUser(
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
        <EmptyState body={loadError} title="Spellbook is unavailable" />
      </Surface>
    );
  }

  if (!spellbook) {
    notFound();
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm sm:p-5">
        <Link
          className="text-sm font-semibold text-[#164f56] underline decoration-[#1f6f78]/45 underline-offset-4"
          href={
            `/campaigns/${campaign.id}/characters/${spellbook.characterId}` as Route
          }
        >
          Back to {spellbook.characterName}
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          {campaign.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight">
          {spellbook.characterName}&apos;s spellbook
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b4657]">
          Track known and prepared spells, concise casting details, and the slot
          pools available during play.
        </p>
      </section>

      <CharacterSpellbookManager
        campaignId={campaign.id}
        spellbook={spellbook}
      />
    </div>
  );
}
