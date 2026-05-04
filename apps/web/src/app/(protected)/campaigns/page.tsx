import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { ProtectedScaffoldPage } from "@/components/protected-scaffold-page";

export default async function CampaignsPage() {
  const session = await requireAuthSession();

  if (!getCurrentCampaignAccess(session)) {
    return <CampaignAccessState />;
  }

  return (
    <ProtectedScaffoldPage
      body="Campaign membership is now the source of truth for which local users can open campaign-scoped screens."
      eyebrow="Campaigns"
      title="Campaigns"
    />
  );
}
