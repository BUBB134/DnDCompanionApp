import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { ProtectedScaffoldPage } from "@/components/protected-scaffold-page";

export default async function RulesPage() {
  const session = await requireAuthSession();

  if (!(await getCurrentCampaignAccess(session))) {
    return <CampaignAccessState />;
  }

  return (
    <ProtectedScaffoldPage
      body="Rules surfaced for a campaign now inherit membership-based visibility, so players only receive player-safe context."
      eyebrow="Rules"
      title="Rules"
    />
  );
}
