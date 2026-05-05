import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { ProtectedScaffoldPage } from "@/components/protected-scaffold-page";

export default async function EntitiesPage() {
  const session = await requireAuthSession();

  if (!(await getCurrentCampaignAccess(session))) {
    return <CampaignAccessState />;
  }

  return (
    <ProtectedScaffoldPage
      body="Campaign wiki content will respect membership-based access so player-safe entries and DM-only details can diverge safely."
      eyebrow="Campaign wiki"
      title="Entities"
    />
  );
}
