import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";
import { loadCharacterCreationCatalogForUser } from "@/characters/creation-options";
import { CharacterCreateForm } from "@/components/character-create-form";

type CharacterCreatePageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function CharacterCreatePage({
  params,
}: CharacterCreatePageProps) {
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

  const catalog = await loadCharacterCreationCatalogForUser(
    session.user.id,
    campaign.id,
  );

  return (
    <div className="grid gap-5">
      <div>
        <Link
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[#164f56] underline decoration-[#1f6f78]/45 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
          href={`/campaigns/${campaign.id}/characters` as Route}
        >
          Back to campaign characters
        </Link>
      </div>
      <Surface className="p-4 sm:p-6">
        <CharacterCreateForm
          campaign={campaign}
          draftOwnerId={session.user.id}
          loadNotice={catalog.loadNotice}
          options={catalog.options}
        />
      </Surface>
    </div>
  );
}
