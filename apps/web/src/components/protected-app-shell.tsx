import Image from "next/image";
import type { Route } from "next";
import { isDungeonMaster, type AuthSession, type Campaign } from "@dnd/types";
import { StatusPill } from "@dnd/ui";
import { signOutAction } from "@/auth/actions";
import { AuthStatusNotice } from "@/auth/status-notice";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { AppShellNavigation } from "@/components/app-shell-navigation";
import { ClerkAccountControls } from "@/components/clerk-account-controls";
import { PRODUCT_MARK_PATH, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/brand";

type ProtectedAppShellProps = {
  appEnv: string;
  authProvider: "clerk" | "local";
  campaign: Campaign | null;
  children: React.ReactNode;
  session: AuthSession;
};

const baseNavigationItems = [
  { description: "Recap, open hooks, and table shortcuts", href: "/", label: "Home" },
  {
    description: "Create, join, or switch campaign context",
    href: "/campaigns",
    label: "Campaigns",
  },
  {
    description: "Capture notes and continue the latest session",
    href: "/sessions",
    label: "Sessions",
  },
  {
    description: "Find conditions and mechanics quickly",
    href: "/rules",
    label: "Rules",
  },
  {
    description: "Review people, places, quests, and items",
    href: "/entities",
    label: "Entities",
  },
] as const;

export function ProtectedAppShell({
  appEnv,
  authProvider,
  campaign,
  children,
  session,
}: ProtectedAppShellProps) {
  const navigationItems = isDatabaseCampaignId(campaign?.id ?? "")
    ? [
        ...baseNavigationItems.slice(0, 2),
        {
          campaignScoped: "characters" as const,
          description: "Profiles, abilities, spells, and actions",
          href: `/campaigns/${campaign?.id}/characters` as Route,
          label: "Characters",
        },
        ...baseNavigationItems.slice(2),
      ]
    : baseNavigationItems;

  return (
    <main className="min-h-screen px-3 py-4 text-arcane-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-6 sm:gap-5">
        <header className="rounded-2xl border border-arcane-ink/10 bg-arcane-surface/92 shadow-[var(--arcane-shadow-panel)] backdrop-blur">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <Image
                  alt=""
                  className="h-12 w-12 rounded-lg"
                  height={96}
                  priority
                  src={PRODUCT_MARK_PATH}
                  width={96}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-arcane-oxblood">
                    {PRODUCT_NAME}
                  </p>
                  <h1 className="font-brand-display text-2xl font-semibold leading-tight">
                    Your campaign table
                  </h1>
                  <p className="mt-1 text-sm text-arcane-subtle">
                    {PRODUCT_TAGLINE}
                  </p>
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
                  {authProvider === "clerk" ? (
                    <ClerkAccountControls />
                  ) : (
                    <form action={signOutAction} className="sm:shrink-0">
                      <button
                        className="min-h-11 w-full rounded-lg border border-arcane-ink/15 bg-arcane-surface px-3 py-2 text-sm font-semibold transition hover:border-arcane-oxblood sm:w-auto"
                        type="submit"
                      >
                        Sign out
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

          </div>
        </header>

        <div className="sticky top-2 z-30 lg:hidden">
          <AppShellNavigation items={navigationItems} mobile />
        </div>

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
