"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import * as m from "motion/react-m";
import {
  ChefHat,
  ConciergeBell,
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  Package,
  QrCode,
  ReceiptText,
  Table2,
  Users,
} from "lucide-react";
import { useRmsStore } from "@/lib/store/store";
import { cn } from "@/lib/utils/cn";
import { GlassPanel } from "@/components/ui/surface";
import { Initials } from "@/components/ui/misc";
import { LiveClock } from "@/components/domain/elapsed";
import { ConnectionPill } from "./connection-pill";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/admin/tables", label: "Floor", icon: Table2 },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/waiter", label: "Service", icon: ConciergeBell },
  { href: "/takeaway", label: "Takeaway", icon: Package },
  { href: "/admin/menu", label: "Menu", icon: MenuIcon },
  { href: "/admin/staff", label: "Team", icon: Users },
  { href: "/admin/qr", label: "QR codes", icon: QrCode },
];

/**
 * The staff chrome.
 *
 * Icon-only rail up to `xl`, labelled beyond it. The active indicator is a
 * gold bar that slides between items with `layoutId` — cheap, and it makes
 * navigation feel like one object moving rather than two states swapping.
 */
export function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const identity = useRmsStore((s) => s.identity);
  const [mobileNav, setMobileNav] = React.useState(false);

  const current = NAV.find((n) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href),
  );

  return (
    <div className="flex min-h-dvh">
      {/* ── rail ───────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-line bg-surface-1 transition-transform duration-[--duration-base] ease-[--ease-swift] lg:z-30 lg:w-[72px] lg:translate-x-0 xl:w-[260px]",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-line px-5 lg:justify-center xl:justify-start">
          <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-line-gold bg-surface-2 font-display text-sm text-gold-300">
            ◆
          </span>
          <span className="font-display text-md font-light tracking-tight text-ink lg:hidden xl:inline">
            Noir <span className="text-gold-400">&amp;</span> Gold
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {NAV.map((n) => {
              const active = n.exact
                ? pathname === n.href
                : pathname.startsWith(n.href);
              const Icon = n.icon;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setMobileNav(false)}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-sm px-3 text-sm transition-colors duration-[--duration-micro] lg:justify-center xl:justify-start",
                      active
                        ? "bg-surface-3 text-ink"
                        : "text-ink-3 hover:bg-surface-2 hover:text-ink-2",
                    )}
                  >
                    {active ? (
                      <m.span
                        layoutId="nav-bar"
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold-400"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <Icon
                      className={cn("size-4 shrink-0", active && "text-gold-300")}
                      strokeWidth={1.25}
                    />
                    <span className="lg:hidden xl:inline">{n.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 lg:justify-center xl:justify-start">
            <Initials initials={identity?.name?.slice(0, 2).toUpperCase() ?? "GG"} />
            <div className="min-w-0 lg:hidden xl:block">
              <p className="truncate text-sm text-ink">
                {identity?.name ?? "Guest access"}
              </p>
              <p className="text-2xs uppercase tracking-label text-ink-4">
                {identity?.role.replace("_", " ") ?? "demo"}
              </p>
            </div>
            <Link
              href="/login"
              aria-label="Switch role"
              className="ml-auto grid size-8 shrink-0 place-items-center rounded-sm text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink-2 lg:hidden xl:grid"
            >
              <LogOut className="size-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </aside>

      {mobileNav ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      {/* ── content ────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[72px] xl:pl-[260px]">
        <GlassPanel className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-line px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
            className="-ml-1 grid size-9 place-items-center rounded-sm text-ink-2 hover:bg-surface-3 lg:hidden"
          >
            <MenuIcon className="size-4" strokeWidth={1.5} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-2xs uppercase tracking-luxe text-ink-4">
              Service
            </p>
            <h1 className="truncate font-display text-md font-light text-ink">
              {current?.label ?? "Noir & Gold"}
            </h1>
          </div>

          <LiveClock className="hidden text-sm sm:block" />
          <ConnectionPill />
        </GlassPanel>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
