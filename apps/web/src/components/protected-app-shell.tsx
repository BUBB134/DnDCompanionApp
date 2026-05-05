import Image from "next/image";
import { isDungeonMaster, type AuthSession, type Campaign } from "@dnd/types";
import { StatusPill } from "@dnd/ui";
import { signOutAction } from "@/auth/actions";
import { AuthStatusNotice } from "@/auth/status-notice";
import { AppShellNavigation } from "@/components/app-shell-navigation";

type ProtectedAppShellProps = {
  appEnv: string;
  campaign: Campaign | null;
  children: React.ReactNode;
  session: AuthSession;
};

const navigationItems = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/sessions", label: "Sessions" },
  { href: "/rules", label: "Rules" },
  { href: "/entities", label: "Entities" },
] as const;

export function ProtectedAppShell({
  appEnv,
  campaign,
  children,
  session,
}: ProtectedAppShellProps) {
  return (
    <main className="min-h-screen px-3 py-4 text-[#17161f] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-6 sm:gap-5">
        <header className="rounded-2xl border border-[#17161f]/10 bg-white/90 shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <Image
                  alt=""
                  className="h-12 w-12 rounded-lg"
                  height={96}
                  priority
                  src="/brand-mark.svg"
                  width={96}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8b2f39]">
                    D&D Companion
                  </p>
                  <h1 className="text-2xl font-semibold leading-tight">Campaign table</h1>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:min-w-[20rem] xl:items-end">
                <AuthStatusNotice />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:w-full xl:flex-col xl:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="teal">{session.user.name}</StatusPill>
                    {campaign ? (
                      <>
                        <StatusPill tone="gold">{campaign.name}</StatusPill>
                        <StatusPill tone={isDungeonMaster(campaign.role) ? "red" : "teal"}>
                          {isDungeonMaster(campaign.role) ? "DM access" : "Player access"}
                        </StatusPill>
                      </>
                    ) : (
                      <StatusPill tone="red">No campaign access</StatusPill>
                    )}
                    <StatusPill tone="gold">Env: {appEnv}</StatusPill>
                  </div>
                  <form action={signOutAction} className="sm:shrink-0">
                    <button
                      className="min-h-10 w-full rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#8b2f39] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 sm:w-auto"
                      type="submit"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="lg:hidden">
              <AppShellNavigation items={navigationItems} mobile />
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden lg:block">
            <div className="sticky top-5">
              <AppShellNavigation items={navigationItems} />
            </div>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
