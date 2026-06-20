import { coreCharacterCreationOptions } from "@dnd/db/character-creation-content";
import type { CharacterCreationOption } from "@dnd/types";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";
import { listCharacterCreationOptionsForUser } from "@/characters/creation-options";
import { hasCompleteCharacterCreationCatalog } from "@/characters/creation-profile";
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

  let options: CharacterCreationOption[] = coreCharacterCreationOptions;
  let loadNotice: string | null = null;

  try {
    const storedOptions = await listCharacterCreationOptionsForUser(
      session.user.id,
      campaign.id,
    );

    if (hasCompleteCharacterCreationCatalog(storedOptions)) {
      options = storedOptions;
    } else {
      loadNotice =
        "The saved choice library is incomplete, so this flow is using the bundled MVP choices.";
    }
  } catch {
    loadNotice =
      "The saved choice library could not be refreshed, so this flow is using the bundled MVP choices.";
  }

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
          loadNotice={loadNotice}
          options={options}
        />
      </Surface>
    </div>
  );
}
