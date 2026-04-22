import Image from "next/image";
import Link from "next/link";
import type { AuthSession } from "@dnd/types";
import { StatusPill } from "@dnd/ui";
import { signOutAction } from "@/auth/actions";
import { AuthStatusNotice } from "@/auth/status-notice";

type ProtectedAppShellProps = {
  appEnv: string;
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

const navItemClasses =
  "rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2";

const mobileNavItemClasses =
  "flex min-h-12 items-center justify-center rounded-md px-1 text-center text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2";

export function ProtectedAppShell({
  appEnv,
  children,
  session,
}: ProtectedAppShellProps) {
  return (
    <main className="min-h-screen px-4 py-5 text-[#17161f] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-24 lg:pb-5">
        <header className="rounded-lg border border-[#17161f]/10 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <AuthStatusNotice />
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="teal">{session.user.name}</StatusPill>
                <StatusPill tone="gold">Env: {appEnv}</StatusPill>
              </div>
              <form action={signOutAction}>
                <button
                  className="min-h-10 w-full rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#8b2f39] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 sm:w-auto"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav
              aria-label="Primary"
              className="sticky top-5 rounded-lg border border-[#17161f]/10 bg-white/85 p-3 shadow-sm"
            >
              <div className="grid gap-1">
                {navigationItems.map((item) => (
                  <NavItem item={item} key={item.label} />
                ))}
              </div>
            </nav>
          </aside>

          <div>{children}</div>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-3 z-10 rounded-lg border border-[#17161f]/10 bg-white/95 p-2 shadow-lg lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {navigationItems.map((item) => (
            <NavItem isMobile item={item} key={item.label} />
          ))}
        </div>
      </nav>
    </main>
  );
}

type NavigationItem = (typeof navigationItems)[number];

function NavItem({
  isMobile = false,
  item,
}: {
  isMobile?: boolean;
  item: NavigationItem;
}) {
  const className = isMobile ? mobileNavItemClasses : navItemClasses;

  return (
    <Link className={`${className} hover:bg-[#e7f5f6]`} href={item.href}>
      {item.label}
    </Link>
  );
}
