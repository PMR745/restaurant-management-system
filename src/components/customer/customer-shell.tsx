"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import * as React from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { openSession, syncCartCount } from "@/lib/store/actions";
import { useCartCount, useCartView, useTableByCode } from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { formatMoney, pluralize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { GlassPanel } from "@/components/ui/surface";

/** `/t/noir/T07/...` — the two path segments every customer screen needs. */
export function useTableRoute() {
  const params = useParams<{ slug: string; tableCode: string }>();
  const slug = params.slug ?? "noir";
  const tableCode = (params.tableCode ?? "").toUpperCase();
  return { slug, tableCode, base: `/t/${slug}/${tableCode}` };
}

/**
 * Opens (or rejoins) the guest's session once the store has hydrated.
 *
 * Rejoining matters more than it sounds: a guest who locks their phone halfway
 * through a meal and comes back must land in the same session, not start a
 * second one on the same table and split their order history in two.
 */
function useSession(tableCode: string) {
  const hydrated = useRmsStore((s) => s.hydrated);
  const table = useTableByCode(tableCode);
  const sessionId = useRmsStore((s) => s.sessionId);
  const cartCount = useCartCount();

  React.useEffect(() => {
    if (!hydrated || !table || sessionId) return;
    const key = `rms:v1:session:${table.id}`;
    const remembered = typeof window !== "undefined"
      ? window.localStorage.getItem(key)
      : null;

    if (remembered) {
      useRmsStore.getState().setSessionId(remembered);
      return;
    }

    const label =
      typeof navigator !== "undefined" && /iPhone|iPad|Android/i.test(navigator.userAgent)
        ? "Mobile · Web"
        : "Desktop · Web";

    void openSession(table.id, table.seats, label).then((id) => {
      try {
        window.localStorage.setItem(key, id);
      } catch {
        /* private mode — the session still works for this tab */
      }
    });
  }, [hydrated, table, sessionId]);

  // Throttled inside the action; this is what turns the table tile amber while
  // a guest is still deciding.
  React.useEffect(() => {
    syncCartCount(sessionId, cartCount);
  }, [sessionId, cartCount]);

  useCartPersistence(table?.id ?? null);

  return table;
}

/**
 * A half-built order must survive a reload.
 *
 * The cart is deliberately never synced — it is the guest's private draft, and
 * broadcasting each tap to every staff screen would be both noisy and a little
 * creepy. But "not synced" must not mean "lost the moment the phone locks and
 * the browser discards the tab", which is an entirely normal thing to happen
 * halfway through choosing dinner. So it is kept in localStorage, per table.
 */
function useCartPersistence(tableId: string | null) {
  const cart = useRmsStore((s) => s.cart);
  const restored = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!tableId || restored.current === tableId) return;
    restored.current = tableId;
    try {
      const raw = window.localStorage.getItem(`rms:v1:cart:${tableId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          useRmsStore.getState().replaceCart(parsed);
        }
      }
    } catch {
      /* unreadable or malformed — start with an empty cart */
    }
  }, [tableId]);

  React.useEffect(() => {
    // Only write after the restore pass, or an empty initial cart would
    // immediately overwrite what we were about to read back.
    if (!tableId || restored.current !== tableId) return;
    try {
      window.localStorage.setItem(
        `rms:v1:cart:${tableId}`,
        JSON.stringify(cart),
      );
    } catch {
      /* private mode — the cart still works for this page view */
    }
  }, [tableId, cart]);
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const { tableCode, base } = useTableRoute();
  const table = useSession(tableCode);
  const pathname = usePathname();
  const [scroll, setScroll] = React.useState({ y: 0, viewport: 0 });

  React.useEffect(() => {
    const onScroll = () =>
      setScroll({ y: window.scrollY, viewport: window.innerHeight });
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const isLanding = pathname === base;
  const isCart = pathname === `${base}/cart`;
  const isTracking = pathname.startsWith(`${base}/order/`);

  const scrolled = scroll.y > 12;

  /**
   * The QR landing opens as a full-bleed curtain-raiser, so the header stays
   * out of the way — but only until the guest scrolls into the menu. Past the
   * hero it has to appear, because the category rail sticks at `top-14` and
   * without a header that band is just a 56px window of menu rows sliding
   * past under the status bar.
   *
   * The header is always mounted and only fades, so `main` keeps a constant
   * `pt-14` and nothing reflows as it appears.
   */
  const pastHero =
    scroll.viewport > 0 && scroll.y > scroll.viewport * 0.7;
  const headerShown = !isLanding || pastHero;

  return (
    <div className="relative min-h-dvh">
      <GlassPanel
        aria-hidden={!headerShown}
        className={cn(
          "fixed inset-x-0 top-0 z-40 h-14 border-b",
          "transition-[opacity,border-color] duration-[--duration-base] ease-[--ease-standard]",
          headerShown ? "opacity-100" : "pointer-events-none opacity-0",
          headerShown && scrolled ? "border-line-gold" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-[560px] items-center justify-between px-4">
          <BackLink base={base} pathname={pathname} />
          <Link
            href={base}
            tabIndex={headerShown ? undefined : -1}
            className="font-display text-md font-light tracking-tight text-ink"
          >
            Noir <span className="text-gold-400">&amp;</span> Gold
          </Link>
          <span className="min-w-16 text-right font-mono text-2xs uppercase tracking-label text-ink-3">
            {table?.code ?? tableCode}
          </span>
        </div>
      </GlassPanel>

      <main className="pt-14">{children}</main>

      {!isCart && !isTracking ? <CartBar base={base} /> : null}
    </div>
  );
}

function BackLink({ base, pathname }: { base: string; pathname: string }) {
  if (pathname === base) return <span className="min-w-16" />;
  const parent = pathname.startsWith(`${base}/item/`) ? base : base;
  return (
    <Link
      href={parent}
      className="-ml-2 inline-flex min-w-16 items-center gap-1 rounded-sm px-2 py-1 text-2xs uppercase tracking-label text-ink-3 transition-colors hover:text-gold-300"
    >
      <ChevronLeft className="size-3.5" strokeWidth={1.5} />
      Menu
    </Link>
  );
}

/**
 * The floating cart pill.
 *
 * It springs up from below the fold the first time the cart becomes non-empty,
 * which is the moment it earns its place on screen. Before that it does not
 * exist — a permanently visible empty cart is clutter.
 */
function CartBar({ base }: { base: string }) {
  const cart = useCartView();
  const visible = cart.count > 0;

  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <Link
            href={`${base}/cart`}
            id="cart-anchor"
            className="gilded mx-auto flex h-14 max-w-[560px] items-center justify-between gap-4 rounded-full bg-surface-2/85 px-5 shadow-lg backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-[--duration-fast] hover:-translate-y-0.5"
          >
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-sm tabular text-gold-300">
                {cart.count}
              </span>
              <span className="text-sm text-ink-2">
                {pluralize(cart.count, "item")}
              </span>
              <span className="text-ink-4">·</span>
              <span className="font-display text-md tabular text-ink">
                {formatMoney(cart.subtotal)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-luxe text-gold-300">
              View order
              <ArrowRight className="size-3.5" strokeWidth={1.5} />
            </span>
          </Link>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
