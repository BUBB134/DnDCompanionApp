"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isDatabaseCampaignId } from "@/campaigns/database-id";

type NavigationItem = {
  campaignScoped?: "characters";
  description: string;
  href: Route;
  label: string;
};

type AppShellNavigationProps = {
  items: readonly NavigationItem[];
  mobile?: boolean;
};

export function AppShellNavigation({
  items,
  mobile = false,
}: AppShellNavigationProps) {
  const pathname = usePathname();
  const matchedCampaignId = pathname.match(
    /^\/campaigns\/([^/]+)(?:\/|$)/,
  )?.[1];
  const routeCampaignId = isDatabaseCampaignId(matchedCampaignId ?? "")
    ? matchedCampaignId
    : null;
  const resolvedItems = items.map((item) =>
    item.campaignScoped === "characters" && routeCampaignId
      ? {
          ...item,
          href: `/campaigns/${routeCampaignId}/characters` as Route,
        }
      : item,
  );
  const activeHref = resolvedItems
    .filter((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <nav
      aria-label={mobile ? "Primary mobile navigation" : "Primary navigation"}
      className={
        mobile
          ? "rounded-2xl border border-[#17161f]/10 bg-white/95 p-2 shadow-xl backdrop-blur"
          : "rounded-2xl border border-[#17161f]/10 bg-white/85 p-3 shadow-sm"
      }
    >
      <div
        className={
          mobile
            ? "flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "grid gap-1"
        }
      >
        {resolvedItems.map((item) => {
          const isActive = item.href === activeHref;

          const baseClasses = mobile
            ? "flex min-h-12 min-w-[5.5rem] shrink-0 items-center justify-center rounded-xl border px-3 py-2 text-center text-xs font-semibold leading-tight transition focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
            : "rounded-xl border px-3 py-3 transition focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2";

          const stateClasses = isActive
            ? "border-[#17161f] bg-[#17161f] text-white shadow-sm"
            : mobile
              ? "border-transparent bg-[#f7f1e5] text-[#17161f] hover:border-[#1f6f78]/25 hover:bg-[#e7f5f6]"
              : "border-transparent text-[#17161f] hover:border-[#1f6f78]/20 hover:bg-[#e7f5f6]";

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.label}: ${item.description}`}
              className={`${baseClasses} ${stateClasses}`}
              href={item.href}
              key={item.label}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              {mobile ? null : (
                <span
                  className={`mt-1 block text-xs leading-5 ${
                    isActive ? "text-white/75" : "text-[#625d6d]"
                  }`}
                >
                  {item.description}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
