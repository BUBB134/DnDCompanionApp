import { cookies } from "next/headers";

export const ACTIVE_CAMPAIGN_COOKIE_NAME = "dnd_active_campaign";
const ACTIVE_CAMPAIGN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getActiveCampaignId() {
  const cookieStore = await cookies();

  return cookieStore.get(ACTIVE_CAMPAIGN_COOKIE_NAME)?.value ?? null;
}

export async function setActiveCampaignId(campaignId: string) {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: ACTIVE_CAMPAIGN_COOKIE_MAX_AGE_SECONDS,
    name: ACTIVE_CAMPAIGN_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: campaignId,
  });
}
