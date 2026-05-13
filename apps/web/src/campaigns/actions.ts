"use server";

import { formatDatabaseError } from "@dnd/db";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSession, requireAuthSession } from "@/auth/server";
import { setActiveCampaignId } from "@/campaigns/active-campaign";
import {
  createCampaignSubmission,
  initialCreateCampaignActionState,
  type CreateCampaignActionState,
} from "@/campaigns/create-campaign";
import {
  acceptCampaignInviteForUser,
  CampaignInviteError,
  createCampaignInviteForUser,
  initialGenerateCampaignInviteActionState,
  revokeCampaignInviteForUser,
  type GenerateCampaignInviteActionState,
} from "@/campaigns/invites";
import {
  createCampaignForUser,
  getDatabaseCampaignAccessForUser,
} from "@/campaigns/repository";

export async function createCampaignAction(
  _previousState: CreateCampaignActionState = initialCreateCampaignActionState,
  formData: FormData,
) {
  void _previousState;
  const session = await requireAuthSession();
  const result = await createCampaignSubmission(
    { createCampaignForUser },
    session.user,
    {
      firstSessionTitle: getStringField(formData, "firstSessionTitle"),
      name: getStringField(formData, "name"),
      openingHook: getStringField(formData, "openingHook"),
      ruleset: getStringField(formData, "ruleset"),
      startingLocation: getStringField(formData, "startingLocation"),
      summary: getStringField(formData, "summary"),
      tone: getStringField(formData, "tone"),
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

export async function generateCampaignInviteAction(
  _previousState: GenerateCampaignInviteActionState =
    initialGenerateCampaignInviteActionState,
  formData: FormData,
): Promise<GenerateCampaignInviteActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");

  if (!campaignId) {
    return {
      ...initialGenerateCampaignInviteActionState,
      formError: "Choose a campaign before generating an invite link.",
    };
  }

  try {
    const invite = await createCampaignInviteForUser(session.user, campaignId);

    return {
      expiresAt: invite.expiresAt,
      formError: null,
      inviteId: invite.id,
      inviteUrl: await createInviteUrl(invite.token),
    };
  } catch (error) {
    return {
      ...initialGenerateCampaignInviteActionState,
      formError: formatCampaignInviteError(error),
    };
  }
}

export async function revokeCampaignInviteAction(formData: FormData) {
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");
  const inviteId = getStringField(formData, "inviteId");

  if (!campaignId || !inviteId) {
    redirect("/campaigns");
  }

  await revokeCampaignInviteForUser(session.user.id, campaignId, inviteId);
  redirect(`/campaigns/${campaignId}`);
}

export async function acceptCampaignInviteAction(formData: FormData) {
  const token = getStringField(formData, "token");

  if (!token) {
    redirect("/campaigns");
  }

  const tokenPath = `/invite/${encodeURIComponent(token)}`;
  const session = await getAuthSession();

  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(tokenPath)}`);
  }

  const result = await acceptCampaignInviteForUser(session.user, token);

  if (result.status === "accepted" || result.status === "already-member") {
    await setActiveCampaignId(result.campaign.id);
    redirect(`/campaigns/${result.campaign.id}`);
  }

  redirect(`${tokenPath}?status=${result.status}` as Route);
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

async function createInviteUrl(token: string) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? null;

  if (origin) {
    return new URL(`/invite/${token}`, origin).toString();
  }

  if (!host) {
    return `/invite/${token}`;
  }

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return new URL(`/invite/${token}`, `${protocol}://${host}`).toString();
}

function formatCampaignInviteError(error: unknown) {
  if (error instanceof CampaignInviteError) {
    return error.message;
  }

  return formatDatabaseError(error);
}
