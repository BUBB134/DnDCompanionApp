import { readPublicEnv } from "@dnd/env";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { ProtectedAppShell } from "@/components/protected-app-shell";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await requireAuthSession();
  const env = readPublicEnv(process.env);
  const campaign = getCurrentCampaignAccess(session);

  return (
    <ProtectedAppShell appEnv={env.NEXT_PUBLIC_APP_ENV} campaign={campaign} session={session}>
      {children}
    </ProtectedAppShell>
  );
}
