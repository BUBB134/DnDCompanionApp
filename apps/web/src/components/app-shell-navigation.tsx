"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
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

  return (
    <nav
      aria-label="Primary"
      className={
        mobile
          ? "rounded-2xl border border-[#17161f]/10 bg-white/95 p-2 shadow-lg backdrop-blur"
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
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const baseClasses = mobile
            ? "flex min-h-12 min-w-[5rem] shrink-0 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-semibold leading-tight transition focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
            : "rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2";

          const stateClasses = isActive
            ? "bg-[#17161f] text-[#f7f1e5] shadow-sm"
            : mobile
              ? "bg-[#f7f1e5] text-[#17161f] hover:bg-[#e7f5f6]"
              : "text-[#17161f] hover:bg-[#e7f5f6]";

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`${baseClasses} ${stateClasses}`}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
