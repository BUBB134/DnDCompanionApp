const DATABASE_CAMPAIGN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDatabaseId(value: string) {
  return DATABASE_CAMPAIGN_ID_PATTERN.test(value);
}

export function isDatabaseCampaignId(campaignId: string) {
  return isDatabaseId(campaignId);
}
