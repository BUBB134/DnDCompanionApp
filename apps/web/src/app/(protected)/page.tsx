import { requireAuthSession } from "@/auth/server";
import { getCampaignHomeData } from "@/campaigns/bootstrap";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { CampaignShell } from "@/components/campaign-shell";

export default async function Home() {
  const session = await requireAuthSession();
  const campaignHomeData = getCampaignHomeData(session);

  if (!campaignHomeData) {
    return <CampaignAccessState />;
  }

  return <CampaignShell {...campaignHomeData} />;
}
