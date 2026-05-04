import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { ProtectedScaffoldPage } from "@/components/protected-scaffold-page";

export default async function SessionsPage() {
  const session = await requireAuthSession();

  if (!getCurrentCampaignAccess(session)) {
    return <CampaignAccessState />;
  }

  return (
    <ProtectedScaffoldPage
      body="Session notes and recaps stay available only to campaign members, with DM-only context reserved for DM access."
      eyebrow="Sessions"
      title="Sessions"
    />
  );
}
