import { readPublicEnv } from "@dnd/env";
import { requireAuthSession } from "@/auth/server";
import { ProtectedAppShell } from "@/components/protected-app-shell";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await requireAuthSession();
  const env = readPublicEnv(process.env);

  return (
    <ProtectedAppShell appEnv={env.NEXT_PUBLIC_APP_ENV} session={session}>
      {children}
    </ProtectedAppShell>
  );
}
