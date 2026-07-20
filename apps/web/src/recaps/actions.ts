"use server";

import { formatDatabaseError } from "@dnd/db";
import type { SessionRecapFormat } from "@dnd/types";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import type { SessionRecapActionState } from "@/recaps/action-state";
import { generateSessionRecapForUser } from "@/recaps/service";

export async function generateSessionRecapAction(
  _previousState: SessionRecapActionState,
  formData: FormData,
): Promise<SessionRecapActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");
  const sessionId = getStringField(formData, "sessionId");
  const recapFormat = getRecapFormat(formData);

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
      recapFormat,
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
    success: `${recapFormat === "detailed" ? "Detailed" : "Quick"} recap and open hooks generated from player-safe campaign memory.`,
  };
}

function getRecapFormat(formData: FormData): SessionRecapFormat {
  return getStringField(formData, "recapFormat") === "detailed"
    ? "detailed"
    : "quick";
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value.trim() : "";
}
