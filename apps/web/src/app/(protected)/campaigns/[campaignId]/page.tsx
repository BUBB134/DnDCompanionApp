import { formatDatabaseError } from "@dnd/db";
import { EmptyState, Surface } from "@dnd/ui";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/auth/server";
import { getSelectedCampaignDashboardData } from "@/campaigns/bootstrap";
import { CampaignShell } from "@/components/campaign-shell";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const session = await requireAuthSession();
  const { campaignId } = await params;
  let dashboardData: Awaited<
    ReturnType<typeof getSelectedCampaignDashboardData>
  > = null;
  let loadError: string | null = null;

  try {
    dashboardData = await getSelectedCampaignDashboardData(
      session.user.id,
      campaignId,
    );
  } catch (error) {
    loadError = formatDatabaseError(error);
  }

  if (loadError) {
    return (
      <Surface className="p-5">
        <EmptyState body={loadError} title="Campaign details are unavailable" />
      </Surface>
    );
  }

  if (!dashboardData) {
    notFound();
  }

  return <CampaignShell {...dashboardData} />;
}
