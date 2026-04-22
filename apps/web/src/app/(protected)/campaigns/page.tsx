import { ProtectedScaffoldPage } from "@/components/protected-scaffold-page";

export default function CampaignsPage() {
  return (
    <ProtectedScaffoldPage
      body="Campaign records will be added with the campaign creation and dashboard work."
      eyebrow="Campaigns"
      title="Campaigns"
    />
  );
}
