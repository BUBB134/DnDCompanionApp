"use server";

import { formatDatabaseError } from "@dnd/db";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { generateSessionRecapForUser } from "@/recaps/service";

export type SessionRecapActionState = {
  error: string | null;
  success: string | null;
};

export const initialSessionRecapActionState: SessionRecapActionState = {
  error: null,
  success: null,
};

export async function generateSessionRecapAction(
  _previousState: SessionRecapActionState,
  formData: FormData,
): Promise<SessionRecapActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");
  const sessionId = getStringField(formData, "sessionId");

  if (!isDatabaseCampaignId(campaignId) || !sessionId) {
    return {
      error: "Open a saved campaign session before generating a recap.",
      success: null,
    };
  }

  const campaign = await getCurrentCampaignAccess(session, campaignId);

  if (!campaign || campaign.id !== campaignId) {
    return {
      error: "Campaign access is required before generating a recap.",
      success: null,
    };
  }

  try {
    await generateSessionRecapForUser(
      session.user.id,
      campaign.id,
      sessionId,
    );
  } catch (error) {
    return {
      error: formatDatabaseError(error),
      success: null,
    };
  }

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath(`/campaigns/${campaign.id}`);

  return {
    error: null,
    success: "Recap generated from player-safe session sources.",
  };
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value.trim() : "";
}
