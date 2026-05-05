"use server";

import { formatDatabaseError } from "@dnd/db";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/auth/server";
import { setActiveCampaignId } from "@/campaigns/active-campaign";
import {
  createCampaignSubmission,
  initialCreateCampaignActionState,
  type CreateCampaignActionState,
} from "@/campaigns/create-campaign";
import {
  createCampaignForUser,
  getDatabaseCampaignAccessForUser,
} from "@/campaigns/repository";

export async function createCampaignAction(
  _previousState: CreateCampaignActionState = initialCreateCampaignActionState,
  formData: FormData,
) {
  const session = await requireAuthSession();
  const result = await createCampaignSubmission(
    { createCampaignForUser },
    session.user,
    {
      name: getStringField(formData, "name"),
      summary: getStringField(formData, "summary"),
    },
    formatDatabaseError,
  );

  if (!result.ok) {
    return result.state;
  }

  await setActiveCampaignId(result.campaign.id);
  redirect(`/campaigns/${result.campaign.id}`);
}

export async function openCampaignAction(formData: FormData) {
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");
  let campaign: Awaited<ReturnType<typeof getDatabaseCampaignAccessForUser>> = null;

  if (!campaignId) {
    redirect("/campaigns");
  }

  try {
    campaign = await getDatabaseCampaignAccessForUser(session.user.id, campaignId);
  } catch {
    redirect("/campaigns");
  }

  if (!campaign) {
    redirect("/campaigns");
  }

  await setActiveCampaignId(campaign.id);
  redirect(`/campaigns/${campaign.id}`);
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}
